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
  entry,
  language,
}: {
  entry: EntryExists;
  language: Language;
}): string => {
  const { operator, field } = entry;
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
  entry,
  language,
}: {
  entry: EntryMatch;
  language: Language;
}): string => {
  const { value, operator, field } = entry;
  const exceptionOperator = operatorBuilder({ operator, language });

  return `${exceptionOperator}${field}:"${value}"`;
};

export const buildMatchAny = ({
  entry,
  language,
}: {
  entry: EntryMatchAny;
  language: Language;
}): string => {
  const { value, operator, field } = entry;

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
  entry,
  language,
}: {
  entry: EntryNested;
  language: Language;
}): string => {
  const { field, entries: subentries } = entry;
  const and = getLanguageBooleanOperator({ language, value: 'and' });
  const values = subentries.map((subentry) => buildEntry({ entry: subentry, language }));

  return `${field}:{ ${values.join(` ${and} `)} }`;
};

export const buildEntry = ({
  entry,
  language,
}: {
  entry: Entry | EntryNested;
  language: Language;
}): string => {
  if (entriesExists.is(entry)) {
    return buildExists({ entry, language });
  } else if (entriesMatch.is(entry)) {
    return buildMatch({ entry, language });
  } else if (entriesMatchAny.is(entry)) {
    return buildMatchAny({ entry, language });
  } else if (entriesNested.is(entry)) {
    return buildNested({ entry, language });
  } else {
    return '';
  }
};

export const buildExceptionItem = ({
  entries,
  language,
}: {
  entries: EntriesArray;
  language: Language;
}): string => {
  const and = getLanguageBooleanOperator({ language, value: 'and' });
  const exceptionItemEntries = entries.map((entry) => {
    return buildEntry({ entry, language });
  });

  return exceptionItemEntries.join(` ${and} `);
};

export const buildExceptionListQueries = ({
  language,
  lists,
}: {
  language: Language;
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> | undefined;
}): DataQuery[] => {
  if (lists == null || (lists != null && lists.length === 0)) {
    return [];
  }

  const exceptionItems = lists.reduce<string[]>((acc, exceptionItem) => {
    const { entries } = exceptionItem;

    if (entries != null && entries.length > 0 && !hasLargeValueList(entries)) {
      return [...acc, buildExceptionItem({ entries, language })];
    } else {
      return acc;
    }
  }, []);

  if (exceptionItems.length === 0) {
    return [];
  } else {
    return exceptionItems.map((exceptionItem) => {
      return {
        query: exceptionItem,
        language,
      };
    });
  }
};
