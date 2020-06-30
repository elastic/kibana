/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { LegacyAPICaller } from 'src/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

function formatPolicies(policiesMap: any): any {
  if (policiesMap.status === 404) {
    return [];
  }

  return Object.keys(policiesMap).reduce((accum: any[], lifecycleName: string) => {
    const policyEntry = policiesMap[lifecycleName];
    accum.push({
      ...policyEntry,
      name: lifecycleName,
    });
    return accum;
  }, []);
}

async function fetchPolicies(callAsCurrentUser: LegacyAPICaller): Promise<any> {
  const params = {
    method: 'GET',
    path: '/_ilm/policy',
    // we allow 404 since they may have no policies
    ignore: [404],
  };

  return await callAsCurrentUser('transport.request', params);
}

async function addLinkedIndices(callAsCurrentUser: LegacyAPICaller, policiesMap: any) {
  if (policiesMap.status === 404) {
    return policiesMap;
  }
  const params = {
    method: 'GET',
    path: '/*/_ilm/explain',
    // we allow 404 since they may have no policies
    ignore: [404],
  };

  const policyExplanation: any = await callAsCurrentUser('transport.request', params);
  Object.entries(policyExplanation.indices).forEach(([indexName, { policy }]: [string, any]) => {
    if (policy && policiesMap[policy]) {
      policiesMap[policy].linkedIndices = policiesMap[policy].linkedIndices || [];
      policiesMap[policy].linkedIndices.push(indexName);
    }
  });
}

const querySchema = schema.object({
  withIndices: schema.boolean({ defaultValue: false }),
});

export function registerFetchRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/policies'), validate: { query: querySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const query = request.query as typeof querySchema.type;
      const { withIndices } = query;
      const { callAsCurrentUser } = context.core.elasticsearch.legacy.client;

      try {
        const policiesMap = await fetchPolicies(callAsCurrentUser);
        if (withIndices) {
          await addLinkedIndices(callAsCurrentUser, policiesMap);
        }
        const okResponse = { body: formatPolicies(policiesMap) };
        return response.ok(okResponse);
      } catch (e) {
        if (lib.isEsError(e)) {
          return response.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
