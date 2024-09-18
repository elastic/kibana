/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const REQUIRED_FIELDS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.requiredFieldsLabel',
  {
    defaultMessage: 'Required fields',
  }
);

export const FIELD_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.fieldNameLabel',
  {
    defaultMessage: 'Field name',
  }
);

export const FIELD_TYPE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.fieldTypeLabel',
  {
    defaultMessage: 'Field type',
  }
);

export const OPEN_HELP_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.openHelpPopoverAriaLabel',
  {
    defaultMessage: 'Open help popover',
  }
);

export const REQUIRED_FIELDS_GENERAL_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.generalWarningTitle',
  {
    defaultMessage: `Some fields aren't found within the rule's specified index patterns.`,
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

export const FIELD_NAME_NOT_FOUND_WARNING = (name: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.fieldNameNotFoundWarning',
    {
      values: { name },
      defaultMessage: `Field "{name}" is not found within the rule's specified index patterns`,
    }
  );

export const FIELD_TYPE_NOT_FOUND_WARNING = (name: string, type: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.fieldTypeNotFoundWarning',
    {
      values: { name, type },
      defaultMessage: `Field "{name}" with type "{type}" is not found within the rule's specified index patterns`,
    }
  );

export const FIELD_NAME_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.validation.fieldNameRequired',
  {
    defaultMessage: 'Field name is required',
  }
);

export const FIELD_TYPE_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.validation.fieldTypeRequired',
  {
    defaultMessage: 'Field type is required',
  }
);

export const FIELD_NAME_USED_MORE_THAN_ONCE = (name: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.validation.fieldNameUsedMoreThanOnce',
    {
      values: { name },
      defaultMessage: 'Field name "{name}" is already used',
    }
  );
