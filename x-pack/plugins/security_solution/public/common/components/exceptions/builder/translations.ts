/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const FIELD = i18n.translate('xpack.securitySolution.exceptions.builder.fieldDescription', {
  defaultMessage: 'Field',
});

export const OPERATOR = i18n.translate(
  'xpack.securitySolution.exceptions.builder.operatorDescription',
  {
    defaultMessage: 'Operator',
  }
);

export const VALUE = i18n.translate('xpack.securitySolution.exceptions.builder.valueDescription', {
  defaultMessage: 'Value',
});

export const EXCEPTION_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.builder.exceptionFieldPlaceholderDescription',
  {
    defaultMessage: 'Search',
  }
);

export const EXCEPTION_FIELD_NESTED_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.builder.exceptionFieldNestedPlaceholderDescription',
  {
    defaultMessage: 'Search nested field',
  }
);

export const EXCEPTION_OPERATOR_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.builder.exceptionOperatorPlaceholderDescription',
  {
    defaultMessage: 'Operator',
  }
);

export const EXCEPTION_FIELD_VALUE_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.builder.exceptionFieldValuePlaceholderDescription',
  {
    defaultMessage: 'Search field value...',
  }
);

export const EXCEPTION_FIELD_LISTS_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.builder.exceptionListsPlaceholderDescription',
  {
    defaultMessage: 'Search for list...',
  }
);

export const ADD_NESTED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.builder.addNestedDescription',
  {
    defaultMessage: 'Add nested condition',
  }
);

export const ADD_NON_NESTED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.builder.addNonNestedDescription',
  {
    defaultMessage: 'Add non-nested condition',
  }
);
