/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FIELD = i18n.translate('xpack.lists.exceptions.builder.fieldLabel', {
  defaultMessage: 'Field',
});

export const OPERATOR = i18n.translate('xpack.lists.exceptions.builder.operatorLabel', {
  defaultMessage: 'Operator',
});

export const VALUE = i18n.translate('xpack.lists.exceptions.builder.valueLabel', {
  defaultMessage: 'Value',
});

export const EXCEPTION_FIELD_VALUE_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionFieldValuePlaceholder',
  {
    defaultMessage: 'Search field value...',
  }
);

export const EXCEPTION_FIELD_NESTED_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionFieldNestedPlaceholder',
  {
    defaultMessage: 'Search nested field',
  }
);

export const EXCEPTION_FIELD_LISTS_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionListsPlaceholder',
  {
    defaultMessage: 'Search for list...',
  }
);

export const EXCEPTION_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionFieldPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export const EXCEPTION_OPERATOR_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionOperatorPlaceholder',
  {
    defaultMessage: 'Operator',
  }
);

export const ADD_NESTED_DESCRIPTION = i18n.translate(
  'xpack.lists.exceptions.builder.addNestedDescription',
  {
    defaultMessage: 'Add nested condition',
  }
);

export const ADD_NON_NESTED_DESCRIPTION = i18n.translate(
  'xpack.lists.exceptions.builder.addNonNestedDescription',
  {
    defaultMessage: 'Add non-nested condition',
  }
);

export const AND = i18n.translate('xpack.lists.exceptions.andDescription', {
  defaultMessage: 'AND',
});

export const OR = i18n.translate('xpack.lists.exceptions.orDescription', {
  defaultMessage: 'OR',
});
