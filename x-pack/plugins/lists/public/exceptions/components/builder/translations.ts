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

export const EXCEPTION_ITEM_ARIA_LABEL = (
  name: string,
  groupIndex: number,
  positionIndex: number
): string =>
  i18n.translate('xpack.lists.exceptions.item.ariaLabel', {
    defaultMessage: '"{name}" in group {group}, position {position} ',
    values: { group: groupIndex + 1, name, position: positionIndex + 1 },
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

export const CUSTOM_COMBOBOX_OPTION_TEXT = i18n.translate(
  'xpack.lists.exceptions.comboBoxCustomOptionText',
  {
    defaultMessage:
      'Select a field from the list. If your field is not available, create a custom one.',
  }
);

export const FIELD_CONFLICT_INDICES_WARNING_DESCRIPTION = i18n.translate(
  'xpack.lists.exceptions.field.mappingConflict.description',
  {
    defaultMessage:
      'This field is defined as different types across the following indices or is unmapped. This can cause unexpected query results.',
  }
);

export const CONFLICT_MULTIPLE_INDEX_DESCRIPTION = (name: string, count: number): string =>
  i18n.translate('xpack.lists.exceptions.field.index.description', {
    defaultMessage: '{name} ({count} indices)',
    values: { count, name },
  });
