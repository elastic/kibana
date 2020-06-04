/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiCommentProps, EuiAvatar } from '@elastic/eui';
import { capitalize } from 'lodash';
import moment from 'moment';

import * as i18n from './translations';
import {
  FormattedEntry,
  OperatorType,
  OperatorOption,
  ExceptionEntry,
  NestedExceptionEntry,
  DescriptionListItem,
  Comment,
  ExceptionListItemSchema,
} from './types';
import { EXCEPTION_OPERATORS, isOperator } from './operators';

/**
 * Returns the operator type, may not need this if using io-ts types
 *
 * @param entry a single ExceptionItem entry
 */
export const getOperatorType = (entry: ExceptionEntry): OperatorType => {
  switch (entry.type) {
    case 'nested':
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

/**
 * Determines operator selection (is/is not/is one of, etc.)
 * Default operator is "is"
 *
 * @param entry a single ExceptionItem entry
 */
export const getExceptionOperatorSelect = (entry: ExceptionEntry): OperatorOption => {
  const operatorType = getOperatorType(entry);
  const foundOperator = EXCEPTION_OPERATORS.find((operatorOption) => {
    return entry.operator === operatorOption.operator && operatorType === operatorOption.type;
  });

  return foundOperator ?? isOperator;
};

export const determineIfIsNested = (
  tbd: ExceptionEntry | NestedExceptionEntry
): tbd is NestedExceptionEntry => {
  if (tbd.type === 'nested') {
    return true;
  }
  return false;
};

/**
 * Formats ExceptionItem entries into simple field, operator, value
 * for use in rendering items in table
 *
 * @param entries an ExceptionItem's entries
 */
export const getFormattedEntries = (
  entries: Array<ExceptionEntry | NestedExceptionEntry>
): FormattedEntry[] => {
  const formattedEntries = entries.map((entry) => {
    if (determineIfIsNested(entry)) {
      const parent = { fieldName: entry.field, operator: null, value: null, isNested: false };
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
  item: ExceptionEntry;
}): FormattedEntry => {
  const operator = getExceptionOperatorSelect(item);
  const operatorType = getOperatorType(item);
  const value = operatorType === OperatorType.EXISTS ? null : item.value;

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
export const getFormattedComments = (comments: Comment[]): EuiCommentProps[] =>
  comments.map((comment) => ({
    username: comment.user,
    timestamp: moment(comment.timestamp).format('on MMM Do YYYY @ HH:mm:ss'),
    event: i18n.COMMENT_EVENT,
    timelineIcon: <EuiAvatar size="l" name={comment.user.toUpperCase()} />,
    children: <EuiText size="s">{comment.comment}</EuiText>,
  }));
