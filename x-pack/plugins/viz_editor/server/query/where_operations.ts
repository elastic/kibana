/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*********************************************************************************************
 * Logic to convert our query shape into an Elastic search filter clause.
 *********************************************************************************************/

import { And, BooleanOperation, Eq, Gt, Gte, Lt, Lte, Ne, Or, Query } from '../../common';
import { isEmpty } from './util';

/**
 * A function that converts a where operation to an ES boolean operation
 */
type WhereDefinition = (op: any) => any;

/**
 * A map of where operation -> transform function
 */
const whereOperations: { [operation: string]: WhereDefinition } = {
  or(op: Or) {
    return {
      bool: {
        should: op.argument.map(toEsBoolQuery),
      },
    };
  },

  and(op: And) {
    return {
      bool: {
        must: op.argument.map(toEsBoolQuery),
      },
    };
  },

  '>'(op: Gt) {
    const [col, val] = parseComparison(op.argument);
    return esRange(col, {
      from: val,
    });
  },

  '>='(op: Gte) {
    const [col, val] = parseComparison(op.argument);
    return esRange(col, {
      from: val,
      include_lower: true,
    });
  },

  '<'(op: Lt) {
    const [col, val] = parseComparison(op.argument);
    return esRange(col, {
      to: val,
    });
  },

  '<='(op: Lte) {
    const [col, val] = parseComparison(op.argument);
    return esRange(col, {
      to: val,
      include_upper: true,
    });
  },

  '='(op: Eq) {
    const [col, val] = parseComparison(op.argument);
    return {
      term: {
        [col]: {
          value: val,
          boost: 1.0,
        },
      },
    };
  },

  '<>'(op: Ne) {
    return {
      bool: {
        must_not: [whereOperations['='](op.argument)],
      },
    };
  },
};

/**
 * Build an Elasticsearch range clause
 */
function esRange(col: string, clause: any) {
  const esBoolClause = {
    from: null,
    to: null,
    include_lower: false,
    include_upper: false,
    boost: 1.0,
  };

  return {
    range: {
      [col]: {
        ...esBoolClause,
        ...clause,
      },
    },
  };
}

/**
 * Determine if the specified operation is a literal
 */
function isLiteral(operation: string) {
  return operation === 'lit' || operation === 'date';
}

/**
 * Convert an array of operations into an array that contains:
 * ['columnname', 'literal-value'], throw error if this is not
 * possible. We will likely allow more flexible comparisons
 * in the future, but for now are restricted.
 */
function parseComparison([a, b, ...etc]: any[]) {
  if (!isEmpty(etc)) {
    throw new Error(`A boolean condition currently cannot support more than two values.`);
  }

  const { operation: op1, argument: arg1 } = a;
  const { operation: op2, argument: arg2 } = b;

  if (op1 !== 'col' && op2 !== 'col') {
    throw new Error(`A boolean condition requires one column to be specified.`);
  }

  if (!isLiteral(op1) && !isLiteral(op2)) {
    throw new Error(`A boolean condition requires one value to be specified.`);
  }

  return op1 === 'col' ? [arg1, arg2] : [arg2, arg1];
}

/**
 * Convert the specified operation to an Elasticsearch boolean clause
 */
function toEsBoolQuery(op: BooleanOperation) {
  const fn = whereOperations[op.operation];

  if (!fn) {
    throw new Error(`Unrecognized boolean operation: ${op.operation}`);
  }

  return fn(op);
}

/**
 * Build the query portion of the Elasticsearch query.
 */
export function buildWhere(query: Query, esQuery: any) {
  const op = query.where;

  if (isEmpty(op)) {
    return esQuery;
  }

  return {
    ...esQuery,
    query: toEsBoolQuery(op!),
  };
}
