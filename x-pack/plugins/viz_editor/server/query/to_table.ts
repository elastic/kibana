/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*********************************************************************************************
 * Logic to convert an Elasticsearch query result into a tabular format.
 *********************************************************************************************/

import {
  chunkBy,
  ChunkResult,
  Column,
  first,
  flatten,
  isEmpty,
  Query,
  SelectOperation,
} from '../../common';
import { sanitizeQuery } from './sanitize_query';
import { hasAggregations } from './select_operations';

/**
 * Select the group by fields from the Elasticsearch query result
 */
function groupByToTable(
  [{ values: ops }, ...rest]: Array<ChunkResult<SelectOperation>>,
  result: any
) {
  return result.groupby.buckets.map((bucket: any) => {
    const table = (ops as Column[]).reduce((acc: any, op: Column) => {
      const name = op.alias!;
      acc[name] = bucket.key[name];
      return acc;
    }, {});

    const children = unnestResult(rest, bucket);

    return children.length ? children.map((child: any) => ({ ...child, ...table })) : table;
  });
}

/**
 * Select the date histogram field from the Elasticsearch query result
 */
function dateHistogramToTable(
  [{ values: ops }, ...rest]: Array<ChunkResult<SelectOperation>>,
  result: any
) {
  const [op] = ops;
  const name = op.alias!;

  return result[name].buckets.map((bucket: any) => {
    const table = {
      [name]: bucket.key_as_string,
    };

    const children = unnestResult(rest, bucket);

    return children.length ? children.map((child: any) => ({ ...child, ...table })) : table;
  });
}

/**
 * Select the aggregation fields from the Elasticsearch result
 */
function aggToTable([{ values: ops }]: Array<ChunkResult<SelectOperation>>, result: any) {
  return [
    ops.reduce((acc: any, op: SelectOperation) => {
      const name = op.alias!;
      acc[name] = result[name] && result[name].value;
      return acc;
    }, {}),
  ];
}

/**
 * Recursively convert an elastisearch query result into a tabular form
 */
function unnestResult(groups: Array<ChunkResult<SelectOperation>>, result: any) {
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
    throw new Error(`Cannot extract fields for ${group.category}`);
  }

  return fn(groups, result);
}

/**
 * Categorize operations into one of three categories
 */
function selectionCategory(op: SelectOperation): 'groupby' | 'dateHistogram' | 'agg' {
  switch (op.operation) {
    case 'col':
      return 'groupby';
    case 'date_histogram':
      return 'dateHistogram';
    default:
      return 'agg';
  }
}

/**
 * Convert a non-aggregation Elasticsearch query result to a tabular form
 */
function rawToTable(select: SelectOperation[], result: any) {
  const hits = result.hits.hits || [];
  return hits.map(({ fields }: any) => {
    return (select as Column[]).reduce((acc: any, op: Column) => {
      const name = op.alias!;
      acc[name] = first(fields[name]);
      return acc;
    }, {});
  });
}

function getTypeByOp(op: SelectOperation) {
  switch (op.operation) {
    case 'date_histogram':
      return 'date';
    case 'avg':
    case 'count':
    case 'sum':
      return 'number';
    case 'col':
      // TODO how do we get this information?
      return 'number';
  }
}

/**
 * Convert an Elasticsearch query result to a tabular form, using Query
 * to properly extract and alias the columns.
 */
export function toTable(query: Query, result: any) {
  const sanitized = sanitizeQuery(query);

  if (hasAggregations(sanitized)) {
    const groups = chunkBy(selectionCategory, sanitized.select);

    return {
      rows: flatten(unnestResult(groups, result.aggregations)),
      columns: sanitized.select.map(op => ({ id: op.alias!, type: getTypeByOp(op) })),
    };
  }

  return {
    rows: rawToTable(sanitized.select, result),
    columns: sanitized.select.map(op => ({ id: op.alias!, type: getTypeByOp(op) })),
  };
}
