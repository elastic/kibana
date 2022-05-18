/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import {
  AGENT_API_ROUTES,
  AGENT_POLICY_API_ROUTES,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  appRoutesService,
  CheckPermissionsResponse,
  EPM_API_ROUTES,
  GetAgentPoliciesResponse,
  GetAgentStatusResponse,
  GetPackagesResponse,
  PACKAGE_POLICY_API_ROUTES,
} from '@kbn/fleet-plugin/common';
import {
  httpHandlerMockFactory,
  ResponseProvidersInterface,
} from '../../../common/mock/endpoint/http_handler_mock_factory';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { GetPolicyListResponse, GetPolicyResponse } from '../policy/types';
import { FleetAgentPolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_policy_generator';

interface KqlArgumentType {
  type: string;
  value?: string | boolean;
  function?: string;
  arguments?: KqlArgumentType[];
}

const getPackagePoliciesFromKueryString = (kueryString: string): string[] => {
  if (!kueryString) {
    return [];
  }

  const kueryAst: ReturnType<typeof fromKueryExpression> & {
    arguments?: KqlArgumentType[];
  } = fromKueryExpression(kueryString);

  /**
   * # ABOUT THE STRUCTURE RETURNED BY THE KQL PARSER:
   *
   * The kuery AST has a structure similar to to this:
   * given string:
   *
   *    ingest-agent-policies.package_policies: (ddf6570b-9175-4a6d-b288-61a09771c647 or b8e616ae-44fc-4be7-846c-ce8fa5c082dd or 2d95bec3-b48f-4db7-9622-a2b061cc031d)
   *
   * output would be:
   * {
   *   "type": "function",
   *   "function": "or",  // this would not be here if no `OR` was found in the string
   *   "arguments": [
   *     {
   *       "type": "function",
   *       "function": "is",
   *       "arguments": [
   *         {
   *           "type": "literal",
   *           "value": "ingest-agent-policies.package_policies"
   *         },
   *         {
   *           "type": "literal",
   *           "value": "ddf6570b-9175-4a6d-b288-61a09771c647"
   *         },
   *         {
   *           "type": "literal",
   *           "value": false
   *         }
   *       ]
   *     },
   *     // .... other kquery arguments here
   *   ]
   * }
   */

  // Because there could be be many combinations of OR/AND, we just look for any defined literal that
  // looks ot have a value for package_policies.
  if (kueryAst.arguments) {
    const packagePolicyIds: string[] = [];
    const kqlArgumentQueue = [...kueryAst.arguments];

    while (kqlArgumentQueue.length > 0) {
      const kqlArgument = kqlArgumentQueue.shift();

      if (kqlArgument) {
        if (kqlArgument.arguments) {
          kqlArgumentQueue.push(...kqlArgument.arguments);
        }

        if (
          kqlArgument.type === 'literal' &&
          kqlArgument.value === `${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies`
        ) {
          // If the next argument looks to be a value, then user it
          const nextArgument = kqlArgumentQueue[0];
          if (
            nextArgument &&
            nextArgument.type === 'literal' &&
            'string' === typeof nextArgument.value
          ) {
            packagePolicyIds.push(nextArgument.value);
            kqlArgumentQueue.shift();
          }
        }
      }
    }

    return packagePolicyIds;
  }

  return [];
};

export type FleetGetPackageListHttpMockInterface = ResponseProvidersInterface<{
  packageList: () => GetPackagesResponse;
}>;
export const fleetGetPackageListHttpMock =
  httpHandlerMockFactory<FleetGetPackageListHttpMockInterface>([
    {
      id: 'packageList',
      method: 'get',
      path: EPM_API_ROUTES.LIST_PATTERN,
      handler() {
        const generator = new EndpointDocGenerator('seed');

        return {
          items: [generator.generateEpmPackage()],
        };
      },
    },
  ]);

export type FleetGetEndpointPackagePolicyHttpMockInterface = ResponseProvidersInterface<{
  endpointPackagePolicy: () => GetPolicyResponse;
}>;
export const fleetGetEndpointPackagePolicyHttpMock =
  httpHandlerMockFactory<FleetGetEndpointPackagePolicyHttpMockInterface>([
    {
      id: 'endpointPackagePolicy',
      path: PACKAGE_POLICY_API_ROUTES.INFO_PATTERN,
      method: 'get',
      handler: () => {
        const response: GetPolicyResponse = {
          item: new EndpointDocGenerator('seed').generatePolicyPackagePolicy(),
        };
        return response;
      },
    },
  ]);

export type FleetGetEndpointPackagePolicyListHttpMockInterface = ResponseProvidersInterface<{
  endpointPackagePolicyList: () => GetPolicyListResponse;
}>;
export const fleetGetEndpointPackagePolicyListHttpMock =
  httpHandlerMockFactory<FleetGetEndpointPackagePolicyListHttpMockInterface>([
    {
      id: 'endpointPackagePolicyList',
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
      method: 'get',
      handler: () => {
        // FIXME: use new FleetPackagePolicyGenerator (#2262)
        const generator = new EndpointDocGenerator('seed');

        const items = Array.from({ length: 5 }, (_, index) => {
          const policy = generator.generatePolicyPackagePolicy();
          policy.name += ` ${index}`;
          return policy;
        });

        return {
          items,
          total: 1,
          page: 1,
          perPage: 10,
        };
      },
    },
  ]);

export type FleetGetAgentPolicyListHttpMockInterface = ResponseProvidersInterface<{
  agentPolicy: () => GetAgentPoliciesResponse;
}>;
export const fleetGetAgentPolicyListHttpMock =
  httpHandlerMockFactory<FleetGetAgentPolicyListHttpMockInterface>([
    {
      id: 'agentPolicy',
      path: AGENT_POLICY_API_ROUTES.LIST_PATTERN,
      method: 'get',
      handler: ({ query }) => {
        const generator = new EndpointDocGenerator('seed');
        const agentPolicyGenerator = new FleetAgentPolicyGenerator('seed');
        const endpointMetadata = generator.generateHostMetadata();
        const requiredPolicyIds: string[] = [
          // Make sure that the Agent policy returned from the API has the Integration Policy ID that
          // the first endpoint metadata generated is using. This is needed especially when testing the
          // Endpoint Details flyout where certain actions might be disabled if we know the endpoint integration policy no
          // longer exists.
          endpointMetadata.Endpoint.policy.applied.id,

          // In addition, some of our UI logic looks for the existence of certain Endpoint Integration policies
          // using the Agents Policy API (normally when checking IDs since query by ids is not supported via API)
          // so also add the first two package policy IDs that the `fleetGetEndpointPackagePolicyListHttpMock()`
          // method above creates (which Trusted Apps HTTP mocks also use)
          // FIXME: remove hard-coded IDs below and get them from the new FleetPackagePolicyGenerator (#2262)
          'ddf6570b-9175-4a6d-b288-61a09771c647',
          'b8e616ae-44fc-4be7-846c-ce8fa5c082dd',

          // And finally, include any kql filters for package policies ids
          ...getPackagePoliciesFromKueryString((query as { kuery?: string }).kuery ?? ''),
        ];

        return {
          items: requiredPolicyIds.map((packagePolicyId) => {
            return agentPolicyGenerator.generate({
              package_policies: [packagePolicyId],
            });
          }),
          perPage: Math.max(requiredPolicyIds.length, 10),
          total: requiredPolicyIds.length,
          page: 1,
        };
      },
    },
  ]);

export type FleetGetCheckPermissionsInterface = ResponseProvidersInterface<{
  checkPermissions: () => CheckPermissionsResponse;
}>;
export const fleetGetCheckPermissionsHttpMock =
  httpHandlerMockFactory<FleetGetCheckPermissionsInterface>([
    {
      id: 'checkPermissions',
      path: appRoutesService.getCheckPermissionsPath(),
      method: 'get',
      handler: () => {
        return {
          error: undefined,
          success: true,
        };
      },
    },
  ]);

export type FleetGetAgentStatusHttpMockInterface = ResponseProvidersInterface<{
  agentStatus: () => GetAgentStatusResponse;
}>;
export const fleetGetAgentStatusHttpMock =
  httpHandlerMockFactory<FleetGetAgentStatusHttpMockInterface>([
    {
      id: 'agentStatus',
      path: AGENT_API_ROUTES.STATUS_PATTERN,
      method: 'get',
      handler: () => {
        return {
          results: {
            total: 50,
            inactive: 5,
            online: 40,
            error: 0,
            offline: 5,
            updating: 0,
            other: 0,
            events: 0,
          },
        };
      },
    },
  ]);
