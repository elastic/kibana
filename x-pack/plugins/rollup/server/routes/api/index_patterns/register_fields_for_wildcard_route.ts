/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keyBy } from 'lodash';
import { schema } from '@kbn/config-schema';
import { Field } from '../../../lib/merge_capabilities_with_fields';
import { RouteDependencies } from '../../../types';

const parseMetaFields = (metaFields: string | string[]) => {
  let parsedFields: string[] = [];
  if (typeof metaFields === 'string') {
    parsedFields = JSON.parse(metaFields);
  } else {
    parsedFields = metaFields;
  }
  return parsedFields;
};

const getFieldsForWildcardRequest = async (
  context: any,
  request: any,
  response: any,
  IndexPatternsFetcher: any
) => {
  const { callAsCurrentUser } = context.core.elasticsearch.legacy.client;
  const indexPatterns = new IndexPatternsFetcher(callAsCurrentUser);
  const { pattern, meta_fields: metaFields } = request.query;

  let parsedFields: string[] = [];
  try {
    parsedFields = parseMetaFields(metaFields);
  } catch (error) {
    return response.badRequest({
      body: error,
    });
  }

  try {
    const fields = await indexPatterns.getFieldsForWildcard({
      pattern,
      metaFields: parsedFields,
    });

    return response.ok({
      body: { fields },
      headers: {
        'content-type': 'application/json',
      },
    });
  } catch (error) {
    return response.notFound();
  }
};

/**
 * Get list of fields for rollup index pattern, in the format of regular index pattern fields
 */
export const registerFieldsForWildcardRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError, getCapabilitiesForRollupIndices, mergeCapabilitiesWithFields },
  sharedImports: { IndexPatternsFetcher },
}: RouteDependencies) => {
  const querySchema = schema.object({
    pattern: schema.string(),
    meta_fields: schema.arrayOf(schema.string(), {
      defaultValue: [],
    }),
    params: schema.string({
      validate(value) {
        try {
          const params = JSON.parse(value);
          const keys = Object.keys(params);
          const { rollup_index: rollupIndex } = params;

          if (!rollupIndex) {
            return '[request query.params]: "rollup_index" is required';
          } else if (keys.length > 1) {
            const invalidParams = keys.filter((key) => key !== 'rollup_index');
            return `[request query.params]: ${invalidParams.join(', ')} is not allowed`;
          }
        } catch (err) {
          return '[request query.params]: expected JSON string';
        }
      },
    }),
  });

  router.get(
    {
      path: '/api/index_patterns/rollup/_fields_for_wildcard',
      validate: {
        query: querySchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { params, meta_fields: metaFields } = request.query;

      try {
        // Make call and use field information from response
        const { payload } = await getFieldsForWildcardRequest(
          context,
          request,
          response,
          IndexPatternsFetcher
        );
        const fields = payload.fields;
        const parsedParams = JSON.parse(params);
        const rollupIndex = parsedParams.rollup_index;
        const rollupFields: Field[] = [];
        const fieldsFromFieldCapsApi: { [key: string]: any } = keyBy(fields, 'name');
        const rollupIndexCapabilities = getCapabilitiesForRollupIndices(
          await context.rollup!.client.callAsCurrentUser('rollup.rollupIndexCapabilities', {
            indexPattern: rollupIndex,
          })
        )[rollupIndex].aggs;

        // Keep meta fields
        metaFields.forEach(
          (field: string) =>
            fieldsFromFieldCapsApi[field] && rollupFields.push(fieldsFromFieldCapsApi[field])
        );

        const mergedRollupFields = mergeCapabilitiesWithFields(
          rollupIndexCapabilities,
          fieldsFromFieldCapsApi,
          rollupFields
        );
        return response.ok({ body: { fields: mergedRollupFields } });
      } catch (err) {
        if (isEsError(err)) {
          return response.customError({ statusCode: err.statusCode, body: err });
        }
        return response.internalError({ body: err });
      }
    })
  );
};
