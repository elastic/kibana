/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { useUiTracker } from '../../../../../observability/public/hooks/use_track_metric';
import type {
  LogIndexPatternReference,
  LogIndexReference,
} from '../../../../common/log_sources/log_source_configuration';
import {
  logIndexNameReferenceRT,
  logIndexPatternReferenceRT,
} from '../../../../common/log_sources/log_source_configuration';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import type { FormElement } from './form_elements';
import { isFormElementForType } from './form_elements';
import { IndexNamesConfigurationPanel } from './index_names_configuration_panel';
import { IndexPatternConfigurationPanel } from './index_pattern_configuration_panel';
import type { FormValidationError } from './validation_errors';

export const IndicesConfigurationPanel = React.memo<{
  isLoading: boolean;
  isReadOnly: boolean;
  indicesFormElement: FormElement<LogIndexReference | undefined, FormValidationError>;
  tiebreakerFieldFormElement: FormElement<string, FormValidationError>;
  timestampFieldFormElement: FormElement<string, FormValidationError>;
}>(
  ({
    isLoading,
    isReadOnly,
    indicesFormElement,
    tiebreakerFieldFormElement,
    timestampFieldFormElement,
  }) => {
    const trackSwitchToIndexPatternReference = useUiTracker({ app: 'infra_logs' });

    const switchToIndexPatternReference = useCallback(() => {
      indicesFormElement.updateValue(() => undefined);
      trackSwitchToIndexPatternReference({
        metric: 'configuration_switch_to_index_pattern_reference',
      });
    }, [indicesFormElement, trackSwitchToIndexPatternReference]);

    if (isIndexPatternFormElement(indicesFormElement)) {
      return (
        <IndexPatternConfigurationPanel
          isLoading={isLoading}
          isReadOnly={isReadOnly}
          indexPatternFormElement={indicesFormElement}
        />
      );
    } else if (isIndexNamesFormElement(indicesFormElement)) {
      return (
        <>
          <IndexNamesConfigurationPanel
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            indexNamesFormElement={indicesFormElement}
            onSwitchToIndexPatternReference={switchToIndexPatternReference}
          />
          <FieldsConfigurationPanel
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            tiebreakerFieldFormElement={tiebreakerFieldFormElement}
            timestampFieldFormElement={timestampFieldFormElement}
          />
        </>
      );
    } else {
      return null;
    }
  }
);

const isIndexPatternFormElement = isFormElementForType(
  (value): value is LogIndexPatternReference | undefined =>
    value == null || logIndexPatternReferenceRT.is(value)
);

const isIndexNamesFormElement = isFormElementForType(logIndexNameReferenceRT.is);
