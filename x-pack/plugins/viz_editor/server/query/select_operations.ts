/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*********************************************************************************************
 * Logic to convert our query shape into an Elastic search query. It takes a flat list
 * of selection criteria, and converts them into the various-- sometimes heirardchical--
 * shapes expected by the Elasticsearch DSL.
 *********************************************************************************************/

import {
  AvgOperation,
  chunkBy,
  ChunkResult,
  ColumnOperation,
  CountOperation,
  DateHistogramOperation,
  FieldOperation,
  isEmpty,
  partition,
  Query,
  SelectOperation,
  SelectOperator,
  TermsOperation,
} from '../../common';

/**
 * A handful of transformation functions for a select operation,
 * used to build up an ES query and flatten the results.
 */
export interface SelectDefinition {
  toEsAgg?: (op: any) => any;
  toNestedQuery?: (query: Query, ops: SelectOperation[], getSubAggs: () => any) => any;
  getName?: (op: any) => string;
}

/**
 * A map of select operations (col, date_histogram, count, etc) to their
 * SelectDefinition, used to convert our definitions into the equivalent
 * Elasticsearch DSL.
 */
export const selectOperations: { [operation in SelectOperator]: SelectDefinition } = {
  column: {
    getName(op: ColumnOperation) {
      return op.alias || op.argument.field;
    },
    toNestedQuery(query: Query, ops: SelectOperation[], getSubAggs: () => any) {
      const cols = ops as ColumnOperation[];
      return {
        aggregations: {
          groupby: {
            composite: {
              size: query.size,
              sources: cols.map(col => ({
                [col.alias!]: {
                  terms: {
                    field: col.argument.field,
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
    toNestedQuery(query: Query, ops: SelectOperation[], getSubAggs: () => any) {
      if (ops.length > 1) {
        throw new Error(`Multiple date_histograms are not supported.`);
      }

      const op = ops[0] as DateHistogramOperation;

      return {
        aggregations: {
          [op.alias!]: {
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
        [op.alias!]: {
          value_count: {
            field: '_id',
          },
        },
      };
    },
  },

  terms: {
    getName(op: TermsOperation) {
      return op.alias || op.argument.field;
    },
    toNestedQuery(query: Query, ops: SelectOperation[], getSubAggs: () => any) {
      const op = ops[0] as TermsOperation;

      return {
        aggregations: {
          [op.alias!]: {
            terms: op.argument,
            ...getSubAggs(),
          },
        },
      };
    },
  },

  avg: defineBasicAgg('avg'),
  sum: defineBasicAgg('sum'),
};

/**
 * Basic aggregations seem to pretty much share the same shape,
 * so this is a little helper to generate the definition for
 * the selectOperations map.
 */
function defineBasicAgg(aggName: string) {
  return {
    getName(op: FieldOperation) {
      return op.alias || `${aggName}_${op.argument.field}`;
    },
    toEsAgg(op: FieldOperation) {
      return {
        [op.alias!]: {
          [aggName]: {
            field: op.argument.field,
          },
        },
      };
    },
  };
}

/**
 * Determine if the specified operation is an aggregation
 */
function isAggregationOperation(select: SelectOperation): boolean {
  const definition = selectOperations[select.operation];
  return !!definition && !!definition.toEsAgg;
}

/**
 * Determine if the specified query has aggregation selections
 */
export function hasAggregations(query: Query): boolean {
  return query.select.some(isAggregationOperation);
}

/**
 * Convert the specified operation to an Elasticsearch aggregation
 */
function toEsAgg(op: SelectOperation) {
  const { operation } = op;
  const definition = selectOperations[operation];

  if (!definition || !definition.toEsAgg) {
    throw new Error(`Unrecognized aggregation operation: ${operation}`);
  }

  return definition.toEsAgg(op);
}

/**
 * Convert the specified select operations to a nested groupby / histogram tree
 */
function toNestedQuery(query: Query, select: SelectOperation[], leafAggregations: any) {
  // Recursively build a nested groupby / histogram tree
  function nestGroupings([chunk, ...chunks]: Array<ChunkResult<SelectOperation>>): any {
    const operations = chunk && chunk.values;
    if (!operations || !operations.length) {
      return leafAggregations || {};
    }

    const [op] = operations;
    const operationName = op.operation;
    const operation = selectOperations[operationName];

    if (!operation || !operation.toNestedQuery) {
      throw new Error(`Cannot nest by ${operationName}`);
    }

    return operation.toNestedQuery(query, operations, () => nestGroupings(chunks));
  }

  return nestGroupings(chunkBy(c => c.operation, select));
}

/**
 * Convert the specified query into an Elasticsearch query that has aggregations
 */
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
    ...toNestedQuery(query, cols, aggsQuery),
  };
}

/**
 * Convert the specified query into an Elasticsearch query that has no aggregations
 */
function buildRaw(query: Query, esQuery: any) {
  const cols = query.select as ColumnOperation[];
  return {
    ...esQuery,
    docvalue_fields: cols.map(({ argument: { field } }) => ({ field })),
  };
}

/**
 * Build the "select" portion of the Elasticsearch query
 */
export function buildSelect(query: Query, esQuery: any) {
  const builderFn = hasAggregations(query) ? buildAggregations : buildRaw;
  return builderFn(query, {
    ...esQuery,
    _source: false,
    stored_fields: '_none_',
  });
}
