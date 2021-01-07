/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ElasticsearchClient } from 'kibana/server';
import { ApiResponse } from '@elastic/elasticsearch';

import { IndexLifecyclePolicy, PolicyFromES } from '../../../../common/types';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

interface PoliciesMap {
  [K: string]: Omit<PolicyFromES, 'name'>;
}
function formatPolicies(policiesMap: PoliciesMap): PolicyFromES[] {
  return Object.keys(policiesMap).reduce((accum: PolicyFromES[], lifecycleName: string) => {
    const policyEntry = policiesMap[lifecycleName];
    accum.push({
      ...policyEntry,
      name: lifecycleName,
    });
    return accum;
  }, []);
}

async function fetchPolicies(client: ElasticsearchClient): Promise<ApiResponse<PoliciesMap>> {
  const options = {
    // we allow 404 since they may have no policies
    ignore: [404],
  };

  return client.ilm.getLifecycle({}, options);
}

async function addLinkedIndices(client: ElasticsearchClient, policiesMap: PoliciesMap) {
  const options = {
    // we allow 404 since they may have no policies
    ignore: [404],
  };

  const response = await client.ilm.explainLifecycle<{
    indices: { [indexName: string]: IndexLifecyclePolicy };
  }>({ index: '*' }, options);
  const policyExplanation = response.body;
  Object.entries(policyExplanation.indices).forEach(([indexName, { policy }]) => {
    if (policy && policiesMap[policy]) {
      policiesMap[policy].linkedIndices = policiesMap[policy].linkedIndices || [];
      policiesMap[policy].linkedIndices!.push(indexName);
    }
  });
}

const querySchema = schema.object({
  withIndices: schema.boolean({ defaultValue: false }),
});

export function registerFetchRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/policies'), validate: { query: querySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const query = request.query as typeof querySchema.type;
      const { withIndices } = query;
      const { asCurrentUser } = context.core.elasticsearch.client;

      try {
        const policiesResponse = await fetchPolicies(asCurrentUser);
        if (policiesResponse.statusCode === 404) {
          return response.ok({ body: [] });
        }
        const { body: policiesMap } = policiesResponse;
        if (withIndices) {
          await addLinkedIndices(asCurrentUser, policiesMap);
        }
        return response.ok({ body: formatPolicies(policiesMap) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
