/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiCommentProps, EuiAvatar } from '@elastic/eui';
import { capitalize } from 'lodash';
import moment from 'moment';
import uuid from 'uuid';

import * as i18n from './translations';
import {
  FormattedEntry,
  DescriptionListItem,
  FormattedBuilderEntry,
  CreateExceptionListItemBuilderSchema,
} from './types';
import { EXCEPTION_OPERATORS, isOperator } from '../autocomplete/operators';
import { OperatorOption } from '../autocomplete/types';
import {
  CommentsArray,
  Entry,
  EntriesArray,
  ExceptionListItemSchema,
  NamespaceType,
  OperatorTypeEnum,
  entriesNested,
  entriesExists,
  entriesList,
} from '../../../lists_plugin_deps';
import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';

/**
 * Returns the operator type, may not need this if using io-ts types
 *
 * @param entry a single ExceptionItem entry
 */
export const getOperatorType = (entry: Entry): OperatorTypeEnum => {
  switch (entry.type) {
    case 'match':
      return OperatorTypeEnum.MATCH;
    case 'match_any':
      return OperatorTypeEnum.MATCH_ANY;
    case 'list':
      return OperatorTypeEnum.LIST;
    default:
      return OperatorTypeEnum.EXISTS;
  }
};

/**
 * Determines operator selection (is/is not/is one of, etc.)
 * Default operator is "is"
 *
 * @param entry a single ExceptionItem entry
 */
export const getExceptionOperatorSelect = (entry: Entry): OperatorOption => {
  if (entriesNested.is(entry)) {
    return isOperator;
  } else {
    const operatorType = getOperatorType(entry);
    const foundOperator = EXCEPTION_OPERATORS.find((operatorOption) => {
      return entry.operator === operatorOption.operator && operatorType === operatorOption.type;
    });

    return foundOperator ?? isOperator;
  }
};

export const getExceptionOperatorFromSelect = (value: string): OperatorOption => {
  const operator = EXCEPTION_OPERATORS.filter(({ message }) => message === value);
  return operator[0] ?? isOperator;
};

/**
 * Formats ExceptionItem entries into simple field, operator, value
 * for use in rendering items in table
 *
 * @param entries an ExceptionItem's entries
 */
export const getFormattedEntries = (entries: EntriesArray): FormattedEntry[] => {
  const formattedEntries = entries.map((entry) => {
    if (entriesNested.is(entry)) {
      const parent = {
        fieldName: entry.field,
        operator: undefined,
        value: undefined,
        isNested: false,
      };
      return entry.entries.reduce<FormattedEntry[]>(
        (acc, nestedEntry) => {
          const formattedEntry = formatEntry({
            isNested: true,
            parent: entry.field,
            item: nestedEntry,
          });
          return [...acc, { ...formattedEntry }];
        },
        [parent]
      );
    } else {
      return formatEntry({ isNested: false, item: entry });
    }
  });

  return formattedEntries.flat();
};

export const getEntryValue = (entry: Entry): string | string[] | undefined => {
  if (entriesList.is(entry)) {
    return entry.list.id ?? '';
  } else if (entriesExists.is(entry)) {
    return undefined;
  } else {
    return entry.value;
  }
};

/**
 * Helper method for `getFormattedEntries`
 */
export const formatEntry = ({
  isNested,
  parent,
  item,
}: {
  isNested: boolean;
  parent?: string;
  item: Entry;
}): FormattedEntry => {
  const operator = getExceptionOperatorSelect(item);
  const value = getEntryValue(item);

  return {
    fieldName: isNested ? `${parent}.${item.field}` : item.field,
    operator: operator.message,
    value,
    isNested,
  };
};

export const getOperatingSystems = (tags: string[]): string => {
  const osMatches = tags
    .filter((tag) => tag.startsWith('os:'))
    .map((os) => capitalize(os.substring(3).trim()))
    .join(', ');

  return osMatches;
};

export const getTagsInclude = ({
  tags,
  regex,
}: {
  tags: string[];
  regex: RegExp;
}): [boolean, string | null] => {
  const matches: string[] | null = tags.join(';').match(regex);
  const match = matches != null ? matches[1] : null;
  return [matches != null, match];
};

/**
 * Formats ExceptionItem information for description list component
 *
 * @param exceptionItem an ExceptionItem
 */
export const getDescriptionListContent = (
  exceptionItem: ExceptionListItemSchema
): DescriptionListItem[] => {
  const details = [
    {
      title: i18n.OPERATING_SYSTEM,
      value: getOperatingSystems(exceptionItem._tags),
    },
    {
      title: i18n.DATE_CREATED,
      value: moment(exceptionItem.created_at).format('MMMM Do YYYY @ HH:mm:ss'),
    },
    {
      title: i18n.CREATED_BY,
      value: exceptionItem.created_by,
    },
    {
      title: i18n.COMMENT,
      value: exceptionItem.description,
    },
  ];

  return details.reduce<DescriptionListItem[]>((acc, { value, title }) => {
    if (value != null && value.trim() !== '') {
      return [...acc, { title, description: value }];
    } else {
      return acc;
    }
  }, []);
};

/**
 * Formats ExceptionItem.comments into EuiCommentList format
 *
 * @param comments ExceptionItem.comments
 */
export const getFormattedComments = (comments: CommentsArray): EuiCommentProps[] =>
  comments.map((comment) => ({
    username: comment.created_by,
    timestamp: moment(comment.created_at).format('on MMM Do YYYY @ HH:mm:ss'),
    event: i18n.COMMENT_EVENT,
    timelineIcon: <EuiAvatar size="l" name={comment.created_by.toUpperCase()} />,
    children: <EuiText size="s">{comment.comment}</EuiText>,
  }));

export const getFormattedBuilderEntries = (
  indexPattern: IIndexPattern,
  entries: EntriesArray
): FormattedBuilderEntry[] => {
  const { fields } = indexPattern;
  return entries.map((entry) => {
    if (entriesNested.is(entry)) {
      return {
        parent: entry.field,
        operator: isOperator,
        nested: getFormattedBuilderEntries(indexPattern, entry.entries),
        field: undefined,
        value: undefined,
      };
    } else {
      const [selectedField] = fields.filter(
        ({ name }) => entry.field != null && entry.field === name
      );
      return {
        field: selectedField,
        operator: getExceptionOperatorSelect(entry),
        value: getEntryValue(entry),
      };
    }
  });
};

export const getValueFromOperator = (
  field: IFieldType | undefined,
  selectedOperator: OperatorOption
): Entry => {
  const fieldValue = field != null ? field.name : '';
  switch (selectedOperator.type) {
    case 'match':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.MATCH,
        operator: selectedOperator.operator,
        value: '',
      };
    case 'match_any':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.MATCH_ANY,
        operator: selectedOperator.operator,
        value: [],
      };
    case 'list':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.LIST,
        operator: selectedOperator.operator,
        list: { id: '', type: 'ip' },
      };
    default:
      return {
        field: fieldValue,
        type: OperatorTypeEnum.EXISTS,
        operator: selectedOperator.operator,
      };
  }
};

export const getNewExceptionItem = ({
  listType,
  listId,
  namespaceType,
  ruleName,
}: {
  listType: 'detection' | 'endpoint';
  listId: string;
  namespaceType: NamespaceType;
  ruleName: string;
}): CreateExceptionListItemBuilderSchema => {
  return {
    _tags: [listType],
    comments: [],
    description: `${ruleName} - exception list item`,
    entries: [
      {
        field: '',
        operator: 'included',
        type: 'match',
        value: '',
      },
    ],
    item_id: undefined,
    list_id: listId,
    meta: {
      temporaryUuid: uuid.v4(),
    },
    name: `${ruleName} - exception list item`,
    namespace_type: namespaceType,
    tags: [],
    type: 'simple',
  };
};
