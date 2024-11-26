/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THRESHOLD_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldThresholdFieldLabel',
  {
    defaultMessage: 'Group by',
  }
);

export const THRESHOLD_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldThresholdFieldHelpText',
  {
    defaultMessage: "Select fields to group by. Fields are joined together with 'AND'",
  }
);

export const THRESHOLD_FIELD_COUNT_VALIDATION_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.validations.thresholdFieldFieldData.arrayLengthGreaterThanMaxErrorMessage',
  {
    defaultMessage: 'Number of fields must be 3 or less.',
  }
);

export const THRESHOLD_VALUE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldThresholdValueLabel',
  {
    defaultMessage: 'Threshold',
  }
);

export const THRESHOLD_VALUE_VALIDATION_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.validations.thresholdValueFieldData.numberGreaterThanOrEqualOneErrorMessage',
  {
    defaultMessage: 'Value must be greater than or equal to one.',
  }
);

export const CARDINALITY_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThresholdCardinalityFieldLabel',
  {
    defaultMessage: 'Count',
  }
);

export const CARDINALITY_FIELD_MISSING_VALIDATION_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.validations.thresholdCardinalityFieldFieldData.thresholdCardinalityFieldNotSuppliedMessage',
  {
    defaultMessage: 'A Cardinality Field is required.',
  }
);

export const CARDINALITY_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThresholdFieldCardinalityFieldHelpText',
  {
    defaultMessage: 'Select a field to check cardinality',
  }
);

export const CARDINALITY_VALUE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThresholdCardinalityValueFieldLabel',
  {
    defaultMessage: 'Unique values',
  }
);

export const CARDINALITY_VALUE_VALIDATION_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.validations.thresholdCardinalityValueFieldData.numberGreaterThanOrEqualOneErrorMessage',
  {
    defaultMessage: 'Value must be greater than or equal to one.',
  }
);
