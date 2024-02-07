/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextServiceStartContract } from '../mocks';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { EndpointInternalFleetServicesInterface } from '../services/fleet';

import { ALL_APP_FEATURE_KEYS } from '@kbn/security-solution-features/keys';
import type { AppFeaturesService } from '../../lib/app_features_service/app_features_service';
import { createAppFeaturesServiceMock } from '../../lib/app_features_service/mocks';
import { turnOffAgentPolicyFeatures } from './turn_off_agent_policy_features';
import { FleetAgentPolicyGenerator } from '../../../common/endpoint/data_generators/fleet_agent_policy_generator';
import type { AgentPolicy, GetAgentPoliciesResponseItem } from '@kbn/fleet-plugin/common';

describe('Turn Off Agent Policy Features Migration', () => {
  let esClient: ElasticsearchClient;
  let fleetServices: EndpointInternalFleetServicesInterface;
  let appFeatureService: AppFeaturesService;
  let logger: Logger;

  const callTurnOffAgentPolicyFeatures = () =>
    turnOffAgentPolicyFeatures(esClient, fleetServices, appFeatureService, logger);

  beforeEach(() => {
    const endpointContextStartContract = createMockEndpointAppContextServiceStartContract();

    ({ esClient, logger } = endpointContextStartContract);

    appFeatureService = endpointContextStartContract.appFeaturesService;
    fleetServices = endpointContextStartContract.endpointFleetServicesFactory.asInternalUser();
  });

  describe('and `agentTamperProtection` is enabled', () => {
    it('should do nothing', async () => {
      await callTurnOffAgentPolicyFeatures();

      expect(fleetServices.agentPolicy.list as jest.Mock).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenLastCalledWith(
        'App feature [endpoint_agent_tamper_protection] is enabled. Nothing to do!'
      );
    });
  });

  describe('and `agentTamperProtection` is disabled', () => {
    let policyGenerator: FleetAgentPolicyGenerator;
    let page1Items: GetAgentPoliciesResponseItem[] = [];
    let page2Items: GetAgentPoliciesResponseItem[] = [];
    let page3Items: GetAgentPoliciesResponseItem[] = [];
    let bulkUpdateResponse: AgentPolicy[];

    const generatePolicyMock = (): GetAgentPoliciesResponseItem => {
      return policyGenerator.generate({ is_protected: true });
    };

    beforeEach(() => {
      policyGenerator = new FleetAgentPolicyGenerator('seed');
      const agentPolicyListSrv = fleetServices.agentPolicy.list as jest.Mock;

      appFeatureService = createAppFeaturesServiceMock(
        ALL_APP_FEATURE_KEYS.filter((key) => key !== 'endpoint_agent_tamper_protection')
      );

      page1Items = [generatePolicyMock(), generatePolicyMock()];
      page2Items = [generatePolicyMock(), generatePolicyMock()];
      page3Items = [generatePolicyMock()];

      agentPolicyListSrv
        .mockImplementationOnce(async () => {
          return {
            total: 2500,
            page: 1,
            perPage: 1000,
            items: page1Items,
          };
        })
        .mockImplementationOnce(async () => {
          return {
            total: 2500,
            page: 2,
            perPage: 1000,
            items: page2Items,
          };
        })
        .mockImplementationOnce(async () => {
          return {
            total: 2500,
            page: 3,
            perPage: 1000,
            items: page3Items,
          };
        });

      bulkUpdateResponse = [
        page1Items[0],
        page1Items[1],
        page2Items[0],
        page2Items[1],
        page3Items[0],
      ];

      (fleetServices.agentPolicy.bumpRevision as jest.Mock).mockImplementation(async () => {
        return bulkUpdateResponse;
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update only policies that have protections turn on', async () => {
      await callTurnOffAgentPolicyFeatures();

      expect(fleetServices.agentPolicy.list as jest.Mock).toHaveBeenCalledTimes(3);

      const updates = Array.from({ length: 5 }, (_, i) => ({
        soClient: fleetServices.internalSoClient,
        esClient,
        id: bulkUpdateResponse![i].id,
      }));

      expect(fleetServices.agentPolicy.bumpRevision as jest.Mock).toHaveBeenCalledTimes(5);
      updates.forEach((args, i) => {
        expect(fleetServices.agentPolicy.bumpRevision as jest.Mock).toHaveBeenNthCalledWith(
          i + 1,
          args.soClient,
          args.esClient,
          args.id,
          { removeProtection: true, user: { username: 'elastic' } }
        );
      });

      expect(logger.info).toHaveBeenCalledWith(
        'App feature [endpoint_agent_tamper_protection] is disabled. Checking fleet agent policies for compliance'
      );

      expect(logger.info).toHaveBeenCalledWith(
        `Found 5 policies that need updates:\n${bulkUpdateResponse!
          .map(
            (policy) =>
              `Policy [${policy.id}][${policy.name}] updated to disable agent tamper protection.`
          )
          .join('\n')}`
      );
      expect(logger.info).toHaveBeenCalledWith('Done. All updates applied successfully');
    });

    it('should log failures', async () => {
      (fleetServices.agentPolicy.bumpRevision as jest.Mock).mockImplementationOnce(async () => {
        throw new Error('oh noo');
      });
      await callTurnOffAgentPolicyFeatures();

      expect(logger.error).toHaveBeenCalledWith(
        `Done - 1 out of 5 were successful. Errors encountered:\nPolicy [${
          bulkUpdateResponse![0].id
        }] failed to update due to error: Error: oh noo`
      );

      expect(fleetServices.agentPolicy.bumpRevision as jest.Mock).toHaveBeenCalledTimes(5);
    });
  });
});
