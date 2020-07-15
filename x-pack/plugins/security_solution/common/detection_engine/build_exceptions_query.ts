/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Query as DataQuery } from '../../../../../src/plugins/data/common';
import {
  Entry,
  EntryMatch,
  EntryMatchAny,
  EntryNested,
  EntryExists,
  EntriesArray,
  Operator,
  entriesMatchAny,
  entriesExists,
  entriesMatch,
  entriesNested,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../shared_imports';
import { Language } from './schemas/common/schemas';
import { hasLargeValueList } from './utils';

type Operators = 'and' | 'or' | 'not';
type LuceneOperators = 'AND' | 'OR' | 'NOT';

export const getLanguageBooleanOperator = ({
  language,
  value,
}: {
  language: Language;
  value: Operators;
}): Operators | LuceneOperators => {
  switch (language) {
    case 'lucene':
      const luceneValues: Record<Operators, LuceneOperators> = { and: 'AND', or: 'OR', not: 'NOT' };

      return luceneValues[value];
    case 'kuery':
      return value;
    default:
      return value;
  }
};

export const operatorBuilder = ({
  operator,
  language,
}: {
  operator: Operator;
  language: Language;
}): string => {
  const not = getLanguageBooleanOperator({
    language,
    value: 'not',
  });

  if (operator === 'excluded') {
    return `${not} `;
  } else {
    return '';
  }
};

export const buildExists = ({
  item,
  language,
}: {
  item: EntryExists;
  language: Language;
}): string => {
  const { operator, field } = item;
  const exceptionOperator = operatorBuilder({ operator, language });

  switch (language) {
    case 'kuery':
      return `${exceptionOperator}${field}:*`;
    case 'lucene':
      return `${exceptionOperator}_exists_${field}`;
    default:
      return '';
  }
};

export const buildMatch = ({
  item,
  language,
}: {
  item: EntryMatch;
  language: Language;
}): string => {
  const { value, operator, field } = item;
  const exceptionOperator = operatorBuilder({ operator, language });

  return `${exceptionOperator}${field}:"${value}"`;
};

export const buildMatchAny = ({
  item,
  language,
}: {
  item: EntryMatchAny;
  language: Language;
}): string => {
  const { value, operator, field } = item;

  switch (value.length) {
    case 0:
      return '';
    default:
      const or = getLanguageBooleanOperator({ language, value: 'or' });
      const exceptionOperator = operatorBuilder({ operator, language });
      const matchAnyValues = value.map((v) => `"${v}"`);

      return `${exceptionOperator}${field}:(${matchAnyValues.join(` ${or} `)})`;
  }
};

export const buildNested = ({
  item,
  language,
}: {
  item: EntryNested;
  language: Language;
}): string => {
  const { field, entries } = item;
  const and = getLanguageBooleanOperator({ language, value: 'and' });
  const values = entries.map((entry) => `${entry.field}:"${entry.value}"`);

  return `${field}:{ ${values.join(` ${and} `)} }`;
};

export const evaluateValues = ({
  item,
  language,
}: {
  item: Entry | EntryNested;
  language: Language;
}): string => {
  if (entriesExists.is(item)) {
    return buildExists({ item, language });
  } else if (entriesMatch.is(item)) {
    return buildMatch({ item, language });
  } else if (entriesMatchAny.is(item)) {
    return buildMatchAny({ item, language });
  } else if (entriesNested.is(item)) {
    return buildNested({ item, language });
  } else {
    return '';
  }
};

export const formatQuery = ({
  exceptions,
  language,
  exclude,
}: {
  exceptions: string[];
  language: Language;
  exclude: boolean;
}): string => {
  if (exceptions == null || (exceptions != null && exceptions.length === 0)) {
    return '';
  }

  const or = getLanguageBooleanOperator({ language, value: 'or' });
  const not = getLanguageBooleanOperator({ language, value: 'not' });
  const formattedExceptionItems = exceptions.map((exceptionItem, index) => {
    if (index === 0) {
      return `(${exceptionItem})`;
    }

    return `${or} (${exceptionItem})`;
  });

  const exceptionItemsQuery = formattedExceptionItems.join(' ');
  return exclude ? `${not} (${exceptionItemsQuery})` : exceptionItemsQuery;
};

export const buildExceptionItemEntries = ({
  entries,
  language,
}: {
  entries: EntriesArray;
  language: Language;
}): string => {
  const and = getLanguageBooleanOperator({ language, value: 'and' });
  const exceptionItemEntries = entries.reduce<string[]>((accum, listItem) => {
    const exceptionSegment = evaluateValues({ item: listItem, language });
    return [...accum, exceptionSegment];
  }, []);

  return exceptionItemEntries.join(` ${and} `);
};

export const buildQueryExceptions = ({
  language,
  lists,
  exclude = true,
}: {
  language: Language;
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> | undefined;
  exclude?: boolean;
}): DataQuery[] => {
  if (lists == null || (lists != null && lists.length === 0)) {
    return [];
  }

  const exceptionItems = lists.reduce<string[]>((acc, exceptionItem) => {
    const { entries } = exceptionItem;

    if (entries != null && entries.length > 0 && !hasLargeValueList(entries)) {
      return [...acc, buildExceptionItemEntries({ entries, language })];
    } else {
      return acc;
    }
  }, []);

  if (exceptionItems.length === 0) {
    return [];
  } else {
    const formattedQuery = formatQuery({ exceptions: exceptionItems, language, exclude });
    return [
      {
        query: formattedQuery,
        language,
      },
    ];
  }
};
