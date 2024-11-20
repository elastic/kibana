/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { POLICIES_ROUTE_PATH, INTEGRATION_PACKAGE_NAME } from '../../../common/constants';
import { policiesQueryParamsSchema } from '../../../common';
import type { CloudDefendPolicy } from '../../../common';
import { isNonNullable } from '../../../common/utils/helpers';
import { CloudDefendRouter } from '../../types';
import {
  getAgentStatusesByAgentPolicies,
  type AgentStatusByAgentPolicyMap,
  getCloudDefendAgentPolicies,
  getCloudDefendPackagePolicies,
} from '../../lib/fleet_util';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

const createPolicies = (
  agentPolicies: AgentPolicy[],
  agentStatusByAgentPolicyId: AgentStatusByAgentPolicyMap,
  cloudDefendPackagePolicies: PackagePolicy[]
): Promise<CloudDefendPolicy[]> => {
  const cloudDefendPackagePoliciesMap = new Map(
    cloudDefendPackagePolicies.map((packagePolicy) => [packagePolicy.id, packagePolicy])
  );

  return Promise.all(
    agentPolicies.flatMap((agentPolicy) => {
      const cloudDefendPackagesOnAgent =
        agentPolicy.package_policies
          ?.map(({ id: pckPolicyId }) => {
            return cloudDefendPackagePoliciesMap.get(pckPolicyId);
          })
          .filter(isNonNullable) ?? [];

      const policies = cloudDefendPackagesOnAgent.map(async (cloudDefendPackage) => {
        const agentPolicyStatus = {
          id: agentPolicy.id,
          name: agentPolicy.name,
          agents: agentStatusByAgentPolicyId[agentPolicy.id]?.total,
        };
        return {
          package_policy: cloudDefendPackage,
          agent_policy: agentPolicyStatus,
        };
      });

      return policies;
    })
  );
};

export const defineGetPoliciesRoute = (router: CloudDefendRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: POLICIES_ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: ['cloud-defend-read'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { query: policiesQueryParamsSchema } },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }

        const cloudDefendContext = await context.cloudDefend;

        try {
          const cloudDefendPackagePolicies = await getCloudDefendPackagePolicies(
            cloudDefendContext.soClient,
            cloudDefendContext.packagePolicyService,
            INTEGRATION_PACKAGE_NAME,
            request.query
          );

          const agentPolicies = await getCloudDefendAgentPolicies(
            cloudDefendContext.soClient,
            cloudDefendPackagePolicies.items,
            cloudDefendContext.agentPolicyService
          );

          const agentStatusesByAgentPolicyId = await getAgentStatusesByAgentPolicies(
            cloudDefendContext.agentService,
            agentPolicies,
            cloudDefendContext.logger
          );

          const policies = await createPolicies(
            agentPolicies,
            agentStatusesByAgentPolicyId,
            cloudDefendPackagePolicies.items
          );

          return response.ok({
            body: {
              ...cloudDefendPackagePolicies,
              items: policies,
            },
          });
        } catch (err) {
          const error = transformError(err);
          cloudDefendContext.logger.error(`Failed to fetch policies ${err}`);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
