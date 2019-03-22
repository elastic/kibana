/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  And,
  AvgOperation,
  BooleanOperation,
  Column,
  CountOperation,
  DateHistogramOperation,
  Eq,
  Gt,
  Gte,
  Lt,
  Lte,
  Ne,
  Or,
  Query,
  SelectOperation,
} from './query_types';

// ------------------------------------------------------------------------------------------
// This file contains logic to convert our internal query representation to an
// Elasticsearch query.
// ------------------------------------------------------------------------------------------

// ----------------------------------------
// Type definitions
// ----------------------------------------

// A handful of transformation functions for a select operation,
// used to build up an ES query and flatten the results.
interface SelectDefinition {
  toEsAgg?: (op: any) => any;
  toGroupBy?: (query: Query, ops: SelectOperation[], getSubAggs: () => any) => any;
  getName?: (op: any) => string;
}

// A function that converts a where operation to an ES boolean operation
type WhereDefinition = (op: any) => any;

// ----------------------------------------
// Helper functions
// ----------------------------------------

interface ChunkResult<T> {
  category: string;
  values: T[];
}

// Given a function and an array, produces an
// array of arrays, where each sub-array satisfies
// allAreQqual(subArray.map(fn))
function chunkBy<T>(fn: (x: T) => any, arr: T[]): Array<ChunkResult<T>> {
  const result = [];
  let category;
  let values: T[] = [];

  for (const x of arr) {
    const value = fn(x);

    if (value !== category && values.length) {
      result.push({ category, values });
      values = [];
    }

    category = value;
    values.push(x);
  }

  if (values.length) {
    result.push({ category, values });
  }

  return result;
}

// Get the first value out of the specified array
function first<T>(arr: T[] | undefined): T | undefined {
  return arr ? arr[0] : undefined;
}

// Flattens an array one-level
function flatten<T>(arr: T[] | T[][]): T[] {
  return Array.prototype.concat.apply([], arr);
}

// Partitions an array based on the predicate fn
function partition<T>(fn: (x: T) => boolean, arr: T[]): T[][] {
  const a: T[] = [];
  const b: T[] = [];
  arr.forEach(x => (fn(x) ? a.push(x) : b.push(x)));
  return [a, b];
}

// Determines if x is null, undefined, an empty array [], or an empty object {}
function isEmpty(x: any) {
  return x == null || (Array.isArray(x) && x.length === 0) || Object.keys(x).length === 0;
}

// Determines if the specified operation is a literal
function isLiteral(operation: string) {
  return operation === 'lit' || operation === 'date';
}

// ----------------------------------------
// Select clause
// ----------------------------------------

// A map of select operation -> operation-specific transformation
const selectOperations: { [operation: string]: SelectDefinition } = {
  col: {
    getName(op: Column) {
      return op.alias || op.argument;
    },
    toGroupBy(query: Query, ops: SelectOperation[], getSubAggs: () => any) {
      const cols = ops as Column[];
      return {
        aggregations: {
          groupby: {
            composite: {
              size: query.size,
              sources: cols.map(col => ({
                [getColumnName(col)]: {
                  terms: {
                    field: col.argument,
                    missing_bucket: true,
                    order: 'asc',
                  },
                },
              })),
            },
            ...getSubAggs(),
          },
        },
      };
    },
  },

  date_histogram: {
    getName(op: DateHistogramOperation) {
      return op.alias || `${op.argument.field}_${op.argument.interval}`;
    },
    toGroupBy(query: Query, ops: SelectOperation[], getSubAggs: () => any) {
      if (ops.length > 1) {
        throw new Error(`Multiple date_histograms are not supported.`);
      }

      const op = ops[0] as DateHistogramOperation;

      return {
        aggregations: {
          [getColumnName(op)]: {
            date_histogram: op.argument,
            ...getSubAggs(),
          },
        },
      };
    },
  },

  count: {
    getName(op: AvgOperation) {
      return op.alias || 'count';
    },
    toEsAgg(op: CountOperation) {
      // We perform a count in this way so that it
      // is consistently represented regardless of
      // other query concerns (groupby, histogram, etc)
      return {
        [getColumnName(op)]: {
          value_count: {
            field: '_id',
          },
        },
      };
    },
  },

  avg: {
    getName(op: AvgOperation) {
      return op.alias || `avg_${op.argument}`;
    },
    toEsAgg(op: AvgOperation) {
      return {
        [getColumnName(op)]: {
          avg: {
            field: op.argument,
          },
        },
      };
    },
  },

  sum: {
    getName(op: AvgOperation) {
      return op.alias || `sum_${op.argument}`;
    },
    toEsAgg(op: AvgOperation) {
      return {
        [getColumnName(op)]: {
          sum: {
            field: op.argument,
          },
        },
      };
    },
  },
};

// Converts a select operation to a column name
function getColumnName(select: SelectOperation): string {
  const definition = selectOperations[select.operation];

  if (!definition) {
    return 'not_found';
  }

  return definition.getName ? definition.getName(select) : select.alias || select.operation;
}

// Determine if the specified operation is an aggregation
function isAggregationOperation(select: SelectOperation): boolean {
  const definition = selectOperations[select.operation];
  return !!definition && !!definition.toEsAgg;
}

// Determine if the specified query has aggregation selections
function hasAggregations(query: Query): boolean {
  return query.select.some(isAggregationOperation);
}

// Convert the specified operation to an Elasticsearch aggregation
function toEsAgg(op: SelectOperation) {
  const { operation } = op;
  const definition = selectOperations[operation];

  if (!definition || !definition.toEsAgg) {
    throw new Error(`Unrecognized aggregation operation: ${operation}`);
  }

  return definition.toEsAgg(op);
}

// Recursively build a nested groupby / histogram tree
function nestGroupings(
  query: Query,
  chunkIndex: number,
  chunks: Array<ChunkResult<SelectOperation>>,
  leafAggregations: any
): any {
  const operations = chunks[chunkIndex] && chunks[chunkIndex].values;
  if (!operations || !operations.length) {
    return leafAggregations || {};
  }

  const [op] = operations;
  const operationName = op.operation;
  const operation = selectOperations[operationName];

  if (!operation || !operation.toGroupBy) {
    throw new Error(`Cannot group by ${operationName}`);
  }

  return operation.toGroupBy(query, operations, () =>
    nestGroupings(query, chunkIndex + 1, chunks, leafAggregations)
  );
}

// Converts the specified select operations to a nested groupby / histogram tree
function toEsGroupBy(query: Query, select: SelectOperation[], leafAggregations: any) {
  const chunks = chunkBy(c => c.operation, select);

  return nestGroupings(query, 0, chunks, leafAggregations);
}

// Converts the specified query into an Elasticsearch query that has aggregations
function buildAggregations(query: Query, esQuery: any) {
  const [aggs, cols] = partition(isAggregationOperation, query.select);
  const esAggs = Object.assign.apply({}, aggs.map(toEsAgg) as any);
  const aggsQuery = isEmpty(esAggs) ? {} : { aggregations: esAggs };

  if (isEmpty(cols)) {
    return {
      ...esQuery,
      ...aggsQuery,
    };
  }

  return {
    ...esQuery,
    ...toEsGroupBy(query, cols, aggsQuery),
  };
}

// Converts the specified query into an Elasticsearch query that has no aggregations
function buildRaw(query: Query, esQuery: any) {
  const cols = query.select as Column[];
  return {
    ...esQuery,
    docvalue_fields: cols.map(({ argument }) => ({ field: argument })),
  };
}

// Build the "select" portion of the Elasticsearch query
function buildSelect(query: Query, esQuery: any) {
  const builderFn = hasAggregations(query) ? buildAggregations : buildRaw;
  return builderFn(query, {
    ...esQuery,
    _source: false,
    stored_fields: '_none_',
  });
}

// ----------------------------------------
// Where clause
// ----------------------------------------

// A map of where operation -> transform function
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

// Build an Elasticsearch range clause
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

// Convert an array of operations into an array that contains:
// ['columnname', 'literal-value'], throw error if this is not
// possible. We will likely allow more flexible comparisons
// in the future, but for now are restricted.
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

// Convert the specified operation to an Elasticsearch boolean clause
function toEsBoolQuery(op: BooleanOperation) {
  const fn = whereOperations[op.operation];

  if (!fn) {
    throw new Error(`Unrecognized boolean operation: ${op.operation}`);
  }

  return fn(op);
}

// Build the "query" portion of the Elasticearch query.
function buildWhere(query: Query, esQuery: any) {
  const op = query.where;

  if (isEmpty(op)) {
    return esQuery;
  }

  return {
    ...esQuery,
    query: toEsBoolQuery(op!),
  };
}

// ----------------------------------------
// Query building glue layer
// ----------------------------------------

// Set the root size property in the Elasticsearch query
function buildSize(query: Query, esQuery: any) {
  if (hasAggregations(query)) {
    return {
      ...esQuery,
      size: 0,
    };
  }

  return {
    ...esQuery,
    size: query.size,
  };
}

// Validate and sanitize the query
function sanitizeQuery(query: Query): Query {
  const defaultSize = 100;

  return {
    ...query,
    size: query.size == null ? defaultSize : query.size,
  };
}

// Convert our internal query representation into an Elasticsearch query
export function toEsQuery(query: Query): any {
  const sanitizedQuery = sanitizeQuery(query);
  return buildSize(sanitizedQuery, buildWhere(sanitizedQuery, buildSelect(sanitizedQuery, {})));
}

// ----------------------------------------
// Tabularizing query results
// ----------------------------------------

function groupByToTable(
  [{ values: ops }, ...rest]: Array<ChunkResult<SelectOperation>>,
  result: any
) {
  return result.groupby.buckets.map((bucket: any) => {
    const table = (ops as Column[]).reduce((acc: any, op: Column) => {
      acc[getColumnName(op)] = bucket.key[op.argument];
      return acc;
    }, {});

    const children = getChildTables(rest, bucket);

    return children.length ? children.map((child: any) => ({ ...child, ...table })) : table;
  });
}

function dateHistogramToTable(
  [{ values: ops }, ...rest]: Array<ChunkResult<SelectOperation>>,
  result: any
) {
  const [op] = ops;
  const name = getColumnName(op);

  return result[name].buckets.map((bucket: any) => {
    const table = {
      [name]: bucket.key_as_string,
    };

    const children = getChildTables(rest, bucket);

    return children.length ? children.map((child: any) => ({ ...child, ...table })) : table;
  });
}

function aggToTable([{ values: ops }]: Array<ChunkResult<SelectOperation>>, result: any) {
  return [
    ops.reduce((acc: any, op: SelectOperation) => {
      const name = getColumnName(op);
      acc[name] = result[name] && result[name].value;
      return acc;
    }, {}),
  ];
}

function getChildTables(groups: Array<ChunkResult<SelectOperation>>, result: any) {
  if (isEmpty(groups)) {
    return [];
  }

  const tableFns: any = {
    groupby: groupByToTable,
    dateHistogram: dateHistogramToTable,
    agg: aggToTable,
  };

  const [group] = groups;
  const fn = tableFns[group.category];

  if (!fn) {
    return [];
  }

  return fn(groups, result);
}

function selectionCategory(op: SelectOperation) {
  switch (op.operation) {
    case 'col':
      return 'groupby';
    case 'date_histogram':
      return 'dateHistogram';
    default:
      return 'agg';
  }
}

function rawToTable(select: SelectOperation[], result: any) {
  const hits = result.hits.hits || [];
  return hits.map(({ fields }: any) => {
    return (select as Column[]).reduce((acc: any, op: Column) => {
      const name = getColumnName(op);
      acc[name] = first(fields[name]);
      return acc;
    }, {});
  });
}

export function toTable(query: Query, result: any) {
  if (hasAggregations(query)) {
    const groups = chunkBy(selectionCategory, query.select);

    return flatten(getChildTables(groups, result.aggregations));
  }

  return rawToTable(query.select, result);
}
