/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { forEach, keys, sortBy } from 'lodash';

import { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';
import { enrichPoliciesActions } from '../../../lib/enrich_policies';
import { serializeAsESPolicy } from '../../../../common/lib';
import type { SerializedEnrichPolicy } from '../../../../common';

export const validationSchema = schema.object({
  name: schema.string(),
  type: schema.oneOf([
    schema.literal('match'),
    schema.literal('range'),
    schema.literal('geo_match'),
  ]),
  matchField: schema.string(),
  enrichFields: schema.arrayOf(schema.string()),
  sourceIndices: schema.arrayOf(schema.string()),
  query: schema.maybe(schema.any()),
});

const getMatchingIndicesSchema = schema.object({ pattern: schema.string() }, { unknowns: 'allow' });

const getFieldsFromIndicesSchema = schema.object({
  indices: schema.arrayOf(schema.string()),
});

interface IndicesAggs extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: Array<{ key: unknown }>;
}

const normalizedFieldTypes = {
  long: 'number',
  integer: 'number',
  short: 'number',
  byte: 'number',
  double: 'number',
  float: 'number',
  half_float: 'number',
  scaled_float: 'number',
};

interface FieldItem {
  name: string;
  type: string;
  normalizedType: string;
}

function buildFieldList(fields) {
  const result: FieldItem[] = [];

  forEach(fields, (field, name) => {
    // If the field exists in multiple indexes, the types may be inconsistent.
    // In this case, default to the first type.
    const type = keys(field)[0];

    // Do not include fields that have a type that starts with an underscore.
    if (type[0] === '_') {
      return;
    }

    const normalizedType = normalizedFieldTypes[type] || type;

    result.push({
      name,
      type,
      normalizedType,
    });
  });

  return sortBy(result, 'name');
}

async function getIndices(dataClient: IScopedClusterClient, pattern: string, limit = 10) {
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

export function registerCreateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    { path: addInternalBasePath('/enrich_policies'), validate: { body: validationSchema } },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;

      const { name } = request.body;
      const serializedPolicy = serializeAsESPolicy(request.body as SerializedEnrichPolicy);

      try {
        const res = await enrichPoliciesActions.create(client, name, serializedPolicy);
        return response.ok({ body: res });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );

  router.post(
    {
      path: addInternalBasePath('/enrich_policies/get_matching_indices'),
      validate: { body: getMatchingIndicesSchema },
    },
    async (context, request, response) => {
      const { pattern } = request.body;
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;

      try {
        const indices = await getIndices(client, pattern);

        return response.ok({ body: { indices } });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );

  router.post(
    {
      path: addInternalBasePath('/enrich_policies/get_fields_from_indices'),
      validate: { body: getFieldsFromIndicesSchema },
    },
    async (context, request, response) => {
      const { indices } = request.body;
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;

      try {
        const fieldsResponse = await client.asCurrentUser.fieldCaps(
          {
            index: indices,
            fields: ['*'],
            allow_no_indices: true,
            ignore_unavailable: true,
          },
          { ignore: [404], meta: true }
        );

        const json = fieldsResponse.statusCode === 404 ? { fields: [] } : fieldsResponse.body;

        return response.ok({ body: buildFieldList(json.fields) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
