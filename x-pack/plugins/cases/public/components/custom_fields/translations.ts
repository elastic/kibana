/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const TITLE = i18n.translate('xpack.cases.customFields.title', {
  defaultMessage: 'Custom Fields',
});

export const DESCRIPTION = i18n.translate('xpack.cases.customFields.description', {
  defaultMessage: 'Custom Fields description',
});

export const NO_CUSTOM_FIELDS = i18n.translate('xpack.cases.customFields.noCustomFields', {
  defaultMessage: 'You do not have any fields yet',
});

export const ADD_CUSTOM_FIELD = i18n.translate('xpack.cases.customFields.addCustomField', {
  defaultMessage: 'Add field',
});

export const SAVE_AND_ADD_ANOTHER = i18n.translate('xpack.cases.customFields.saveAndAddAnother', {
  defaultMessage: 'Save and add another',
});

export const SAVE_FIELD = i18n.translate('xpack.cases.customFields.saveField', {
  defaultMessage: 'Save field',
});

export const FIELD_LABEL = i18n.translate('xpack.cases.customFields.fieldLabel', {
  defaultMessage: 'Field label',
});

export const FIELD_LABEL_HELP_TEXT = i18n.translate('xpack.cases.customFields.fieldLabelHelpText', {
  defaultMessage: '50 characters max',
});

export const FIELD_TYPE = i18n.translate('xpack.cases.customFields.fieldType', {
  defaultMessage: 'Field type',
});

export const TextAreaHeight = i18n.translate('xpack.cases.customFields.textAreaHeight', {
  defaultMessage: 'Height of TextArea',
});

export const FIELD_OPTIONS = i18n.translate('xpack.cases.customFields.fieldOptions', {
  defaultMessage: 'Options',
});

export const FIELD_OPTION_REQUIRED = i18n.translate(
  'xpack.cases.customFields.fieldOptions.Required',
  {
    defaultMessage: 'Make this field required',
  }
);

export const CHARACTER_LIMIT = i18n.translate(
  'xpack.cases.customFields.fieldOptions.characterLimit',
  {
    defaultMessage: 'Limit character count to 120',
  }
);

export const MULTIPLE_SELECTIONS = i18n.translate(
  'xpack.cases.configureCases.fieldOptions.multipleSelections',
  {
    defaultMessage: 'Allow multiple selections',
  }
);

export const CUSTOM_VALUES = i18n.translate(
  'xpack.cases.configureCases.fieldOptions.customValues',
  {
    defaultMessage: 'Allow custom values',
  }
);

export const REQUIRED_FIELD = (fieldName: string): string =>
  i18n.translate('xpack.cases.customFields.requiredField', {
    values: { fieldName },
    defaultMessage: '{fieldName} is required.',
  });

export const LIST_ADD_OPTION = i18n.translate('xpack.cases.customFields.list.addOption', {
  defaultMessage: 'Add option',
});

export const LIST_OPTION_PLACEHOLDER = i18n.translate(
  'xpack.cases.customFields.list.optionPlaceholder',
  {
    defaultMessage: 'Enter option',
  }
);
