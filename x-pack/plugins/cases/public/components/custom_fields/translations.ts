/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const TITLE = i18n.translate('xpack.cases.customFields.title', {
  defaultMessage: 'Custom fields',
});

export const DESCRIPTION = i18n.translate('xpack.cases.customFields.description', {
  defaultMessage: 'Add more optional and required fields for customized case collaboration.',
});

export const NO_CUSTOM_FIELDS = i18n.translate('xpack.cases.customFields.noCustomFields', {
  defaultMessage: 'You do not have any fields yet',
});

export const ADD_CUSTOM_FIELD = i18n.translate('xpack.cases.customFields.addCustomField', {
  defaultMessage: 'Add field',
});

export const MAX_CUSTOM_FIELD_LIMIT = (maxCustomFields: number) =>
  i18n.translate('xpack.cases.customFields.maxCustomFieldLimit', {
    values: { maxCustomFields },
    defaultMessage: 'Maximum number of {maxCustomFields} custom fields reached.',
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

export const TEXT_LABEL = i18n.translate('xpack.cases.customFields.textLabel', {
  defaultMessage: 'Text',
});

export const TOGGLE_LABEL = i18n.translate('xpack.cases.customFields.toggleLabel', {
  defaultMessage: 'Toggle',
});

export const NUMBER_LABEL = i18n.translate('xpack.cases.customFields.textLabel', {
  defaultMessage: 'Number',
});

export const FIELD_TYPE = i18n.translate('xpack.cases.customFields.fieldType', {
  defaultMessage: 'Field type',
});

export const FIELD_OPTIONS = i18n.translate('xpack.cases.customFields.fieldOptions', {
  defaultMessage: 'Options',
});

export const DEFAULT_VALUE = i18n.translate('xpack.cases.customFields.defaultValue', {
  defaultMessage: 'Default value',
});

export const FIELD_OPTION_REQUIRED = i18n.translate(
  'xpack.cases.customFields.fieldOptions.Required',
  {
    defaultMessage: 'Make this field required',
  }
);

export const REQUIRED = i18n.translate('xpack.cases.customFields.required', {
  defaultMessage: 'Required',
});

export const REQUIRED_FIELD = (fieldName: string): string =>
  i18n.translate('xpack.cases.customFields.requiredField', {
    values: { fieldName },
    defaultMessage: '{fieldName} is required.',
  });

export const EDIT_CUSTOM_FIELDS_ARIA_LABEL = (customFieldLabel: string) =>
  i18n.translate('xpack.cases.caseView.editCustomFieldsAriaLabel', {
    values: { customFieldLabel },
    defaultMessage: 'click to edit {customFieldLabel}',
  });

export const NO_CUSTOM_FIELD_SET = i18n.translate('xpack.cases.caseView.noCustomFieldSet', {
  defaultMessage: 'No value is added',
});

export const DELETE_FIELD_TITLE = (fieldName: string) =>
  i18n.translate('xpack.cases.customFields.deleteField', {
    values: { fieldName },
    defaultMessage: 'Delete field "{fieldName}"?',
  });

export const DELETE_FIELD_DESCRIPTION = i18n.translate(
  'xpack.cases.customFields.deleteFieldDescription',
  {
    defaultMessage: 'The field will be removed from all cases and data will be lost.',
  }
);

export const DELETE = i18n.translate('xpack.cases.customFields.fieldOptions.Delete', {
  defaultMessage: 'Delete',
});

export const TOGGLE_FIELD_ON_LABEL = i18n.translate(
  'xpack.cases.customFields.tableFilters.toggle.on',
  {
    defaultMessage: 'On',
  }
);

export const TOGGLE_FIELD_OFF_LABEL = i18n.translate(
  'xpack.cases.customFields.tableFilters.toggle.off',
  {
    defaultMessage: 'Off',
  }
);

export const POPULATED_WITH_DEFAULT = i18n.translate(
  'xpack.cases.customFields.fieldOptions.populatedWithDefault',
  {
    defaultMessage: 'This field is populated with the default value.',
  }
);
