/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forEach, keys, sortBy, reduce, size } from 'lodash';
import { flatMap, flow, groupBy, values as valuesFP, map, pickBy } from 'lodash/fp';

import type { IScopedClusterClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';

export type FieldCapsList = FieldCapsResponse['fields'];

const normalizedFieldTypes: { [key: string]: string } = {
  long: 'number',
  integer: 'number',
  short: 'number',
  byte: 'number',
  double: 'number',
  float: 'number',
  half_float: 'number',
  scaled_float: 'number',
  unsigned_long: 'number',
};

interface FieldItem {
  name: string;
  type: string;
  normalizedType: string;
}

interface FieldsPerIndexType {
  index: string;
  fields: FieldItem[];
}

interface IndicesAggs extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: Array<{ key: unknown }>;
}

export function getCommonFields(fieldsPerIndex: FieldsPerIndexType[]) {
  return flow(
    // Flatten the fields arrays
    flatMap('fields'),
    // Group fields by name
    groupBy('name'),
    // Keep groups with more than 1 field
    pickBy((group) => group.length > 1),
    // Convert the result object to an array of fields
    valuesFP,
    // Take the first item from each group (since we only need one match)
    map((group) => group[0])
  )(fieldsPerIndex);
}

export function normalizeFieldsList(fields: FieldCapsList) {
  const result: FieldItem[] = [];

  forEach(fields, (field, name) => {
    // If the field exists in multiple indexes, the types may be inconsistent.
    // In this case, default to the first type.
    const type = keys(field)[0];

    // Do not include fields that have a type that starts with an underscore (e.g. _id, _source)
    if (type.startsWith('_')) {
      return;
    }

    result.push({
      name,
      type,
      normalizedType: normalizedFieldTypes[type] || type,
    });
  });

  return sortBy(result, 'name');
}

export function getIndexNamesFromAliasesResponse(json: Record<string, any>) {
  return reduce(
    json,
    (list, { aliases }, indexName) => {
      // Add the index name to the list
      list.push(indexName);
      // If the index has aliases, add them to the list as well
      if (size(aliases) > 0) {
        list.push(...Object.keys(aliases));
      }

      return list;
    },
    [] as string[]
  );
}

export async function getIndices(dataClient: IScopedClusterClient, pattern: string, limit = 10) {
  // We will first rely on the indices aliases API to get the list of indices and their aliases.
  const aliasResult = await dataClient.asCurrentUser.indices.getAlias(
    {
      index: pattern,
      expand_wildcards: 'open',
    },
    {
      ignore: [404],
      meta: true,
    }
  );

  if (aliasResult.statusCode !== 404) {
    const indicesFromAliasResponse = getIndexNamesFromAliasesResponse(aliasResult.body);
    return indicesFromAliasResponse.slice(0, limit);
  }

  // If the indices aliases API fails or returns nothing, we will rely on the indices stats API to
  // get the list of indices.
  const response = await dataClient.asCurrentUser.search<unknown, { indices: IndicesAggs }>(
    {
      index: pattern,
      body: {
        size: 0,
        aggs: {
          indices: {
            terms: {
              field: '_index',
              size: limit,
            },
          },
        },
      },
    },
    {
      ignore: [404],
      meta: true,
    }
  );

  if (response.statusCode === 404 || !response.body.aggregations) {
    return [];
  }

  const indices = response.body.aggregations.indices;

  return indices.buckets ? indices.buckets.map((bucket) => bucket.key) : [];
}
