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
  'xpack.cases.customFields.fieldOptionRequired',
  {
    defaultMessage: 'Make this field required',
  }
);

export const REQUIRED_FIELD = (fieldName: string): string =>
  i18n.translate('xpack.cases.customFields.requiredField', {
    values: { fieldName },
    defaultMessage: '{fieldName} is required.',
  });
