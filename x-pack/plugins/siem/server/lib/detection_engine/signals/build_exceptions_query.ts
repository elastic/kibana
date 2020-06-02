/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ListOperator,
  ListValues,
  List,
} from '../../../../common/detection_engine/schemas/types/lists_default_array';
import { Query } from '../../../../../../../src/plugins/data/server';
import { RuleAlertParams, Language } from '../types';

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
  operator: ListOperator;
  language: Language;
}): string => {
  const and = getLanguageBooleanOperator({
    language,
    value: 'and',
  });
  const or = getLanguageBooleanOperator({
    language,
    value: 'not',
  });

  switch (operator) {
    case 'excluded':
      return ` ${and} `;
    case 'included':
      return ` ${and} ${or} `;
    default:
      return '';
  }
};

export const buildExists = ({
  operator,
  field,
  language,
}: {
  operator: ListOperator;
  field: string;
  language: Language;
}): string => {
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
  operator,
  field,
  values,
  language,
}: {
  operator: ListOperator;
  field: string;
  values: ListValues[];
  language: Language;
}): string => {
  if (values.length > 0) {
    const exceptionOperator = operatorBuilder({ operator, language });
    const [exception] = values;

    return `${exceptionOperator}${field}:${exception.name}`;
  } else {
    return '';
  }
};

export const buildMatchAll = ({
  operator,
  field,
  values,
  language,
}: {
  operator: ListOperator;
  field: string;
  values: ListValues[];
  language: Language;
}): string => {
  switch (values.length) {
    case 0:
      return '';
    case 1:
      return buildMatch({ operator, field, values, language });
    default:
      const or = getLanguageBooleanOperator({ language, value: 'or' });
      const exceptionOperator = operatorBuilder({ operator, language });
      const matchAllValues = values.map((value) => {
        return value.name;
      });

      return `${exceptionOperator}${field}:(${matchAllValues.join(` ${or} `)})`;
  }
};

export const evaluateValues = ({ list, language }: { list: List; language: Language }): string => {
  const { values_operator: operator, values_type: type, field, values } = list;
  switch (type) {
    case 'exists':
      return buildExists({ operator, field, language });
    case 'match':
      return buildMatch({ operator, field, values: values ?? [], language });
    case 'match_all':
      return buildMatchAll({ operator, field, values: values ?? [], language });
    default:
      return '';
  }
};

export const formatQuery = ({
  exceptions,
  query,
  language,
}: {
  exceptions: string[];
  query: string;
  language: Language;
}): string => {
  if (exceptions.length > 0) {
    const or = getLanguageBooleanOperator({ language, value: 'or' });
    const formattedExceptions = exceptions.map((exception) => {
      return `(${query}${exception})`;
    });

    return formattedExceptions.join(` ${or} `);
  } else {
    return query;
  }
};

export const buildExceptions = ({
  query,
  lists,
  language,
}: {
  query: string;
  lists: List[];
  language: Language;
}): string[] => {
  return lists.reduce<string[]>((accum, listItem) => {
    const { and, ...exceptionDetails } = { ...listItem };
    const andExceptionsSegments = and ? buildExceptions({ query, lists: and, language }) : [];
    const exceptionSegment = evaluateValues({ list: exceptionDetails, language });
    const exception = [...exceptionSegment, ...andExceptionsSegments];

    return [...accum, exception.join('')];
  }, []);
};

export const buildQueryExceptions = ({
  query,
  language,
  lists,
}: {
  query: string;
  language: Language;
  lists: RuleAlertParams['exceptions_list'];
}): Query[] => {
  if (lists && lists !== null) {
    const exceptions = buildExceptions({ lists, language, query });
    const formattedQuery = formatQuery({ exceptions, language, query });

    return [
      {
        query: formattedQuery,
        language,
      },
    ];
  } else {
    return [{ query, language }];
  }
};
