/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';
// import { RUNTIME_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/common/index_patterns';
import { EVENT_RATE_FIELD_ID } from '../../../../../../../common/types/fields';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common/analytics';
import { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { BASIC_NUMERICAL_TYPES, EXTENDED_NUMERICAL_TYPES } from '../../../../common/fields';

export const CATEGORICAL_TYPES = new Set(['ip', 'keyword']);

// Regression supports numeric fields. Classification supports categorical, numeric, and boolean.
export const shouldAddAsDepVarOption = (
  fieldId: string,
  fieldType: ES_FIELD_TYPES,
  jobType: AnalyticsJobType
) => {
  if (fieldId === EVENT_RATE_FIELD_ID) return false;

  const isBasicNumerical = BASIC_NUMERICAL_TYPES.has(fieldType);

  const isSupportedByClassification =
    isBasicNumerical || CATEGORICAL_TYPES.has(fieldType) || fieldType === ES_FIELD_TYPES.BOOLEAN;

  if (jobType === ANALYSIS_CONFIG_TYPE.REGRESSION) {
    return isBasicNumerical || EXTENDED_NUMERICAL_TYPES.has(fieldType);
  }
  if (jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION) return isSupportedByClassification;
};
