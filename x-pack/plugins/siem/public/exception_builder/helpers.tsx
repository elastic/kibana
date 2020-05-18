/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiComboBoxOptionOption, EuiSelectOption } from '@elastic/eui';

import {
  EXCEPTION_OPERATORS,
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isInListOperator,
  isNotInListOperator,
  existsOperator,
  doesNotExistOperator,
} from './operators';
import { OperatorOption, OperatorType, ExceptionItemEntry, ExceptionItem } from './types';
import { BrowserField, BrowserFields } from '../common/containers/source';
import { IIndexPattern, isFilterable } from '../../../../../src/plugins/data/common/index_patterns';

export const getOperatorLabels = (type: string): EuiSelectOption[] => {
  const isTypeEndgame = type === 'endgame';

  return [
    {
      value: isOperator.value,
      text: isOperator.message,
      disabled: false,
    },
    {
      value: isNotOperator.value,
      text: isNotOperator.message,
      disabled: isTypeEndgame,
    },
    {
      value: isOneOfOperator.value,
      text: isOneOfOperator.message,
      disabled: isTypeEndgame,
    },
    {
      value: isNotOneOfOperator.value,
      text: isNotOneOfOperator.message,
      disabled: isTypeEndgame,
    },
    {
      value: existsOperator.value,
      text: existsOperator.message,
      disabled: isTypeEndgame,
    },
    {
      value: doesNotExistOperator.value,
      text: doesNotExistOperator.message,
      disabled: isTypeEndgame,
    },
    {
      value: isInListOperator.value,
      text: isInListOperator.message,
      disabled: isTypeEndgame,
    },
    {
      value: isNotInListOperator.value,
      text: isNotInListOperator.message,
      disabled: isTypeEndgame,
    },
  ];
};

export const getFieldNames = (category: Partial<BrowserField>): string[] =>
  category.fields != null && Object.keys(category.fields).length > 0
    ? Object.keys(category.fields)
    : [];

export const getAllCategoryFieldNames = (
  browserFields: BrowserFields,
  listType: string
): EuiComboBoxOptionOption[] => {
  const endgameFields = ['endgame.signature_signer', 'endgame.sha256', 'file.path'];

  if (listType === 'endgame') {
    return endgameFields.sort().map(fields => ({
      label: fields,
    }));
  } else {
    return Object.keys(browserFields)
      .sort()
      .flatMap(categoryId =>
        getFieldNames(browserFields[categoryId]).map(fieldId => ({
          label: fieldId,
        }))
      );
  }
};

export const getExceptionOperatorSelect = (
  entry: ExceptionItemEntry
): OperatorOption | undefined => {
  const operatorType = getOperatorType(entry);
  return EXCEPTION_OPERATORS.find(operatorOption => {
    return entry.operator === operatorOption.operator && operatorType === operatorOption.type;
  });
};

export const getExceptionOperatorFromSelect = (operatorSelection: string): OperatorOption => {
  return EXCEPTION_OPERATORS.filter(operator => operator.value === operatorSelection)[0];
};

export const getOperatorType = (entry: ExceptionItemEntry): OperatorType => {
  const operatorTypes: string[] = Object.keys(entry).filter(t =>
    Object.values<string>(OperatorType).includes(t)
  );

  switch (operatorTypes[0]) {
    case 'match':
      return OperatorType.PHRASE;
    case 'match_any':
      return OperatorType.PHRASES;
    case 'list':
      return OperatorType.LIST;
    default:
      return OperatorType.EXISTS;
  }
};

export const getEntryValue = (entry: ExceptionItemEntry): string | string[] => {
  const operatorType = getOperatorType(entry);

  if (operatorType === OperatorType.EXISTS) {
    return '';
  } else {
    return entry[operatorType] ?? '';
  }
};

export const formatFieldValues = (
  fieldValue: string | string[] | null
): Array<EuiComboBoxOptionOption<string>> => {
  if (Array.isArray(fieldValue)) {
    return fieldValue.map(value => {
      return {
        label: value,
      };
    });
  } else if (typeof fieldValue === 'string' && fieldValue.trim().length) {
    return [
      {
        label: fieldValue,
      },
    ];
  } else {
    return [];
  }
};

export const getUpdatedEntryFromOperator = ({
  entry,
  selectedOperator,
}: {
  entry: ExceptionItemEntry;
  selectedOperator: string;
}): ExceptionItemEntry => {
  const { operator, type } = getExceptionOperatorFromSelect(selectedOperator);
  const previousOperatorType = getOperatorType(entry);
  const isSameType = type === previousOperatorType;

  if (isSameType) {
    return {
      ...entry,
      operator,
    };
  }

  switch (type) {
    case OperatorType.EXISTS:
      return {
        field: entry.field,
        operator,
      };
    case OperatorType.PHRASE:
      return {
        field: entry.field,
        operator,
        match: '',
      };
    case OperatorType.PHRASES:
      return {
        field: entry.field,
        operator,
        match_any: [],
      };
    case OperatorType.LIST:
      return {
        field: entry.field,
        operator,
        list: '',
      };
    default:
      return entry;
  }
};

export const getFilterableFields = (indexPattern: IIndexPattern) => {
  return indexPattern.fields.filter(isFilterable);
};

/** Creates a new instance of an `ExceptionItem` */
export const createExceptionItem = ({
  listType,
  itemId,
  listId,
}: {
  listType: string;
  itemId: string;
  listId: string;
}): ExceptionItem => ({
  id: null,
  list_id: listId,
  item_id: itemId,
  name: itemId,
  _tags: [listType],
  type: 'simple',
  entries: [
    {
      field: '',
      operator: 'included',
      match: '',
    },
  ],
});
