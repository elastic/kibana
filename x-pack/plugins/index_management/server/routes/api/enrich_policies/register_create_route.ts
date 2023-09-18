/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';
import { enrichPoliciesActions } from '../../../lib/enrich_policies';
import { serializeAsESPolicy } from '../../../../common/lib';
import { normalizeFieldsList, getIndices, FieldCapsList, getCommonFields } from './helpers';
import type { SerializedEnrichPolicy } from '../../../../common';

const validationSchema = schema.object({
  policy: schema.object({
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
  }),
});

const querySchema = schema.object({
  executePolicyAfterCreation: schema.maybe(
    schema.oneOf([schema.literal('true'), schema.literal('false')])
  ),
});

const getMatchingIndicesSchema = schema.object({ pattern: schema.string() }, { unknowns: 'allow' });

const getFieldsFromIndicesSchema = schema.object({
  indices: schema.arrayOf(schema.string()),
});

export function registerCreateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    {
      path: addInternalBasePath('/enrich_policies'),
      validate: { body: validationSchema, query: querySchema },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;
      const executeAfter = Boolean(
        (request.query as TypeOf<typeof querySchema>)?.executePolicyAfterCreation
      );

      const { policy } = request.body;
      const serializedPolicy = serializeAsESPolicy(policy as SerializedEnrichPolicy);

      try {
        const res = await enrichPoliciesActions.create(client, policy.name, serializedPolicy);

        if (executeAfter) {
          try {
            await enrichPoliciesActions.execute(client, policy.name);
          } catch (error) {
            // If executing the policy fails, remove the previously created policy and
            // return the error.
            await enrichPoliciesActions.remove(client, policy.name);
            return handleEsError({ error, response });
          }
        }

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
      let { pattern } = request.body;
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;

      // Add wildcards to the search query to match the behavior of the
      // index pattern search in the Kibana UI.
      if (!pattern.startsWith('*')) {
        pattern = `*${pattern}`;
      }
      if (!pattern.endsWith('*')) {
        pattern = `${pattern}*`;
      }

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
        const fieldsPerIndex = await Promise.all(
          indices.map((index) =>
            client.asCurrentUser.fieldCaps(
              {
                index,
                fields: ['*'],
                allow_no_indices: true,
                ignore_unavailable: true,
                filters: '-metadata',
              },
              { ignore: [404], meta: true }
            )
          )
        );

        const serializedFieldsPerIndex = indices.map((indexName: string, mapIndex: number) => {
          const fields = fieldsPerIndex[mapIndex];
          const json = fields.statusCode === 404 ? { fields: [] } : fields.body;

          return {
            index: indexName,
            fields: normalizeFieldsList(json.fields as FieldCapsList),
          };
        });

        return response.ok({
          body: {
            indices: serializedFieldsPerIndex,
            commonFields: getCommonFields(serializedFieldsPerIndex),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
