/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const REQUIRED_FIELDS_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.fieldRequiredFieldsHelpText',
  {
    defaultMessage: 'Fields required for this Rule to function.',
  }
);

export const REQUIRED_FIELDS_GENERAL_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.generalWarningTitle',
  {
    defaultMessage: 'Some fields are not found within specified index patterns.',
  }
);

export const REQUIRED_FIELDS_GENERAL_WARNING_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.generalWarningDescription',
  {
    defaultMessage: `This doesn't break rule execution, but it might indicate that required fields were set incorrectly. Please check that indices specified in index patterns exist and have expected fields and types in mappings.`,
  }
);

export const OPTIONAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.optionalText',
  {
    defaultMessage: 'Optional',
  }
);

export const REMOVE_REQUIRED_FIELD_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.removeRequiredFieldButtonAriaLabel',
  {
    defaultMessage: 'Remove required field',
  }
);

export const ADD_REQUIRED_FIELD = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.addRequiredFieldButtonLabel',
  {
    defaultMessage: 'Add required field',
  }
);
