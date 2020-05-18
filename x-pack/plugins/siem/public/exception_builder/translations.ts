/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const FIELD = i18n.translate('xpack.siem.exceptions.fieldDescription', {
  defaultMessage: 'Field',
});

export const OPERATOR = i18n.translate('xpack.siem.exceptions.fieldDescription', {
  defaultMessage: 'Operator',
});

export const DOES_NOT_EXIST = i18n.translate('xpack.siem.exceptions.doesNotExistLabel', {
  defaultMessage: 'does not exist',
});

export const EXISTS = i18n.translate('xpack.siem.exceptions.existsLabel', {
  defaultMessage: 'exists',
});

export const IS = i18n.translate('xpack.siem.exceptions.isLabel', {
  defaultMessage: 'is',
});

export const IS_NOT = i18n.translate('xpack.siem.exceptions.isNotLabel', {
  defaultMessage: 'is not',
});

export const IS_ONE_OF = i18n.translate('xpack.siem.exceptions.isOneOfLabel', {
  defaultMessage: 'is one of',
});

export const IS_NOT_ONE_OF = i18n.translate('xpack.siem.exceptions.isNotOneOfLabel', {
  defaultMessage: 'is not one of',
});

export const IS_IN_LIST = i18n.translate('xpack.siem.exceptions.isInListLabel', {
  defaultMessage: 'is in list',
});

export const IS_NOT_IN_LIST = i18n.translate('xpack.siem.exceptions.isNotInListLabel', {
  defaultMessage: 'is not in list',
});

export const ADD_EXCEPTIONS_TITLE = i18n.translate('xpack.siem.exceptions.addExceptionsTitle', {
  defaultMessage: 'Add exceptions',
});

export const ADD_EXCEPTION_TITLE = i18n.translate('xpack.siem.exceptions.addExceptionTitle', {
  defaultMessage: 'Add exception',
});

export const AND = i18n.translate('xpack.siem.exceptions.andDescription', {
  defaultMessage: 'AND',
});

export const OR = i18n.translate('xpack.siem.exceptions.orDescription', {
  defaultMessage: 'OR',
});

export const EXCEPTION_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.siem.exceptions.exceptionFieldPlaceholderDescription',
  {
    defaultMessage: 'Search',
  }
);

export const EXCEPTION_FIELD_VALUE_PLACEHOLDER = i18n.translate(
  'xpack.siem.exceptions.exceptionFieldvALUEPlaceholderDescription',
  {
    defaultMessage: 'Start typing a value',
  }
);

export const EXCEPTION_LIST_VALUE_PLACEHOLDER = i18n.translate(
  'xpack.siem.exceptions.exceptionListValuePlaceholderDescription',
  {
    defaultMessage: 'Select a list',
  }
);

export const ADD_EXCEPTIONS_DESCRIPTION = i18n.translate(
  'xpack.siem.exceptions.addExceptionsDescription',
  {
    values: {
      html_emphasizedText: 'except',
    },
    defaultMessage: `Alerts are generated when the rule&rsquo;s conditions are met, {html_emphasizedText} when:`,
  }
);

export const DELETE = i18n.translate('xpack.siem.exceptions.deleteDescription', {
  defaultMessage: 'Delete',
});
