/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  INFO_ROUTE_PATH,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../../common/constants';
import { CspAppContext } from '../../plugin';
import { CspRouter } from '../../types';
import { CspSetupStatus } from '../../../common/types';
import {
  AgentPolicyServiceInterface,
  AgentService,
  PackagePolicyServiceInterface,
} from '@kbn/fleet-plugin/server';
import {
  addRunningAgentToAgentPolicy,
  getAgentPolicies,
  getCspPackagePolicies,
} from '../benchmarks/benchmarks';

const getLatestFindingsStatus = async (
  esClient: ElasticsearchClient
): Promise<CspSetupStatus['latestFindingsIndexStatus']> => {
  try {
    const queryResult = await esClient.search({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
      query: {
        match_all: {},
      },
      size: 1,
    });
    const hasLatestFinding = !!queryResult.hits.hits.length;

    return hasLatestFinding ? 'applicable' : 'inapplicable';
  } catch (e) {
    return 'inapplicable';
  }
};

const getPluginStatus = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyServiceInterface,
  agentPolicyService: AgentPolicyServiceInterface,
  agentService: AgentService
) => {
  const latestFindingsIndexStatus = await getLatestFindingsStatus(esClient);
  if (latestFindingsIndexStatus === 'applicable') {
    return latestFindingsIndexStatus;
  }

  const cspPackagePolicies = await getCspPackagePolicies(
    soClient,
    packagePolicyService,
    CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    {}
  );

  const agentPolicies = await getAgentPolicies(
    soClient,
    cspPackagePolicies.items,
    agentPolicyService
  );

  const enrichAgentPolicies = await addRunningAgentToAgentPolicy(agentService, agentPolicies);
  let isRunningAgent = false;
  for (var agentPolicy of enrichAgentPolicies) {
    if (agentPolicy.agents && agentPolicy.agents > 0) {
      console.log({ agentPolicy });
      isRunningAgent = true;
      break;
    }
  }
  // console.log(agentPolicies[0]);
  if (!isRunningAgent) {
    console.log('No Agent running');
    return 'not deployed';
  }
  return 'foo';
};

export const defineGetCspSetupStatusRoute = (router: CspRouter, cspContext: CspAppContext): void =>
  router.get(
    {
      path: INFO_ROUTE_PATH,
      validate: false,
    },
    async (context, _, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const soClient = (await context.core).savedObjects.client;

        const agentService = cspContext.service.agentService;
        const agentPolicyService = cspContext.service.agentPolicyService;
        const packagePolicyService = cspContext.service.packagePolicyService;

        if (!agentPolicyService || !agentService || !packagePolicyService) {
          throw new Error(`Failed to get Fleet services`);
        }
        const foo = await getPluginStatus(
          esClient,
          soClient,
          packagePolicyService,
          agentPolicyService,
          agentService
        );

        const body = {
          foo,
        };

        return response.ok({
          body,
        });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(`Error while fetching findings status: ${err}`);

        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
