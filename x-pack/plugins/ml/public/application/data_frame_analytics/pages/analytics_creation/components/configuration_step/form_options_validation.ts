/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { EVENT_RATE_FIELD_ID } from '../../../../../../../common/types/fields';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common/analytics';
import { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { BASIC_NUMERICAL_TYPES, EXTENDED_NUMERICAL_TYPES } from '../../../../common/fields';

export const CATEGORICAL_TYPES = new Set(['ip', 'keyword']);

// Regression supports numeric fields. Classification supports categorical, numeric, and boolean.
export const shouldAddAsDepVarOption = (
  fieldId: string,
  fieldType: ES_FIELD_TYPES | estypes.MappingRuntimeField['type'],
  jobType: AnalyticsJobType
) => {
  if (fieldId === EVENT_RATE_FIELD_ID) return false;

  const isBasicNumerical = BASIC_NUMERICAL_TYPES.has(fieldType as ES_FIELD_TYPES);

  const isSupportedByClassification =
    isBasicNumerical || CATEGORICAL_TYPES.has(fieldType) || fieldType === ES_FIELD_TYPES.BOOLEAN;

  if (jobType === ANALYSIS_CONFIG_TYPE.REGRESSION) {
    return isBasicNumerical || EXTENDED_NUMERICAL_TYPES.has(fieldType as ES_FIELD_TYPES);
  }
  if (jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION) return isSupportedByClassification;
};

export const handleExplainErrorMessage = (
  errorMessage: string,
  sourceIndex: string,
  jobType: AnalyticsJobType
) => {
  let maxDistinctValuesErrorMessage;
  let unsupportedFieldsErrorMessage;
  let toastNotificationWarning;
  let toastNotificationDanger;
  if (
    jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
    (errorMessage.includes('must have at most') || errorMessage.includes('must have at least'))
  ) {
    maxDistinctValuesErrorMessage = errorMessage;
  } else if (
    errorMessage.includes('status_exception') &&
    errorMessage.includes('unsupported type')
  ) {
    unsupportedFieldsErrorMessage = errorMessage;
  } else if (
    errorMessage.includes('status_exception') &&
    errorMessage.includes('Unable to estimate memory usage as no documents')
  ) {
    toastNotificationWarning = i18n.translate(
      'xpack.ml.dataframe.analytics.create.allDocsMissingFieldsErrorMessage',
      {
        defaultMessage: `Unable to estimate memory usage. There are mapped fields for source index [{index}] that do not exist in any indexed documents. You will have to switch to the JSON editor for explicit field selection and include only fields that exist in indexed documents.`,
        values: {
          index: sourceIndex,
        },
      }
    );
  } else {
    toastNotificationDanger = {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.unableToFetchExplainDataMessage', {
        defaultMessage: 'An error occurred fetching analysis fields data.',
      }),
      text: errorMessage,
    };
  }

  return {
    maxDistinctValuesErrorMessage,
    unsupportedFieldsErrorMessage,
    toastNotificationDanger,
    toastNotificationWarning,
  };
};
