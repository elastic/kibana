/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isSavedObjectNotFoundError } from '../../../../../../../src/plugins/kibana_utils/common';
import { useUiTracker } from '../../../../../observability/public';
import {
  LogIndexNameReference,
  logIndexNameReferenceRT,
  LogIndexPatternReference,
} from '../../../../common/log_sources';
import { useKibanaIndexPatternService } from '../../../hooks/use_kibana_index_patterns';
import { useCompositeFormElement, useFormElement } from './form_elements';
import {
  FormValidationError,
  validateIndexPattern,
  validateStringNotEmpty,
} from './validation_errors';

export type LogIndicesFormState = LogIndexNameReference | LogIndexPatternReference | undefined;

export const useLogIndicesFormElement = (initialValue: LogIndicesFormState) => {
  const indexPatternService = useKibanaIndexPatternService();

  const trackIndexPatternValidationError = useUiTracker({ app: 'infra_logs' });

  const logIndicesFormElement = useFormElement<LogIndicesFormState, FormValidationError>({
    initialValue,
    validate: useMemo(
      () => async (logIndices) => {
        if (logIndices == null) {
          return validateStringNotEmpty('log index pattern', '');
        } else if (logIndexNameReferenceRT.is(logIndices)) {
          return validateStringNotEmpty('log indices', logIndices.indexName);
        } else {
          const emptyStringErrors = validateStringNotEmpty(
            'log index pattern',
            logIndices.indexPatternId
          );

          if (emptyStringErrors.length > 0) {
            return emptyStringErrors;
          }

          const indexPatternErrors = await indexPatternService
            .get(logIndices.indexPatternId)
            .then(validateIndexPattern, (error: Error): FormValidationError[] => {
              if (isSavedObjectNotFoundError(error)) {
                return [
                  {
                    type: 'missing_index_pattern' as const,
                    indexPatternId: logIndices.indexPatternId,
                  },
                ];
              } else {
                throw error;
              }
            });

          if (indexPatternErrors.length > 0) {
            trackIndexPatternValidationError({
              metric: 'configuration_index_pattern_validation_failed',
            });
          } else {
            trackIndexPatternValidationError({
              metric: 'configuration_index_pattern_validation_succeeded',
            });
          }

          return indexPatternErrors;
        }
      },
      [indexPatternService, trackIndexPatternValidationError]
    ),
  });

  return logIndicesFormElement;
};

export interface FieldsFormState {
  tiebreakerField: string;
  timestampField: string;
}

export const useFieldsFormElement = (initialValues: FieldsFormState) => {
  const tiebreakerFieldFormElement = useFormElement<string, FormValidationError>({
    initialValue: initialValues.tiebreakerField,
    validate: useMemo(
      () => async (tiebreakerField) => validateStringNotEmpty('tiebreaker', tiebreakerField),
      []
    ),
  });

  const timestampFieldFormElement = useFormElement<string, FormValidationError>({
    initialValue: initialValues.timestampField,
    validate: useMemo(
      () => async (timestampField) => validateStringNotEmpty('timestamp', timestampField),
      []
    ),
  });

  const fieldsFormElement = useCompositeFormElement(
    useMemo(
      () => ({
        childFormElements: {
          tiebreaker: tiebreakerFieldFormElement,
          timestamp: timestampFieldFormElement,
        },
      }),
      [tiebreakerFieldFormElement, timestampFieldFormElement]
    )
  );

  return {
    fieldsFormElement,
    tiebreakerFieldFormElement,
    timestampFieldFormElement,
  };
};
