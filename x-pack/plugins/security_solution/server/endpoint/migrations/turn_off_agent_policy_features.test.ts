/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextServiceStartContract } from '../mocks';
import type { Logger } from '@kbn/logging';
import type { EndpointInternalFleetServicesInterface } from '../services/fleet';

import { ALL_PRODUCT_FEATURE_KEYS } from '@kbn/security-solution-features/keys';
import type { ProductFeaturesService } from '../../lib/product_features_service/product_features_service';
import { createProductFeaturesServiceMock } from '../../lib/product_features_service/mocks';
import { turnOffAgentPolicyFeatures } from './turn_off_agent_policy_features';

describe('Turn Off Agent Policy Features Migration', () => {
  let fleetServices: EndpointInternalFleetServicesInterface;
  let productFeatureService: ProductFeaturesService;
  let logger: Logger;

  const callTurnOffAgentPolicyFeatures = () =>
    turnOffAgentPolicyFeatures(fleetServices, productFeatureService, logger);

  beforeEach(() => {
    const endpointContextStartContract = createMockEndpointAppContextServiceStartContract();

    ({ logger } = endpointContextStartContract);

    productFeatureService = endpointContextStartContract.productFeaturesService;
    fleetServices = endpointContextStartContract.endpointFleetServicesFactory.asInternalUser();
  });

  describe('and `agentTamperProtection` is enabled', () => {
    it('should do nothing', async () => {
      await callTurnOffAgentPolicyFeatures();

      expect(
        fleetServices.agentPolicy.turnOffAgentTamperProtections as jest.Mock
      ).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenLastCalledWith(
        'App feature [endpoint_agent_tamper_protection] is enabled. Nothing to do!'
      );
    });
  });

  describe('and `agentTamperProtection` is disabled', () => {
    beforeEach(() => {
      productFeatureService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_agent_tamper_protection')
      );
    });

    it('should log proper message if all agent policies are already protected', async () => {
      (fleetServices.agentPolicy.turnOffAgentTamperProtections as jest.Mock).mockResolvedValueOnce({
        updatedPolicies: null,
        failedPolicies: [],
      });
      await callTurnOffAgentPolicyFeatures();
      expect(logger.info).toHaveBeenCalledWith('All agent policies are compliant, nothing to do!');
    });

    it('should log proper message if all agent policies are updated successfully', async () => {
      (fleetServices.agentPolicy.turnOffAgentTamperProtections as jest.Mock).mockResolvedValueOnce({
        updatedPolicies: [{ id: 'policy 1' }, { id: 'policy 2' }],
        failedPolicies: [],
      });
      await callTurnOffAgentPolicyFeatures();
      expect(logger.info).toHaveBeenLastCalledWith(
        'Done - 2 out of 2 were successful. No errors encountered.'
      );
    });

    it('should log proper message if all agent policies fail to update', async () => {
      (fleetServices.agentPolicy.turnOffAgentTamperProtections as jest.Mock).mockResolvedValueOnce({
        updatedPolicies: null,
        failedPolicies: [
          { id: 'policy1', error: 'error1' },
          { id: 'policy2', error: 'error2' },
        ],
      });
      await callTurnOffAgentPolicyFeatures();
      expect(logger.error).toHaveBeenLastCalledWith(
        'Done - all 2 failed to update. Errors encountered:\nPolicy [policy1] failed to update due to error: error1\nPolicy [policy2] failed to update due to error: error2'
      );
    });

    it('should log proper message if some agent policies fail to update', async () => {
      (fleetServices.agentPolicy.turnOffAgentTamperProtections as jest.Mock).mockResolvedValueOnce({
        updatedPolicies: [{ id: 'policy3' }],
        failedPolicies: [{ id: 'policy1', error: 'error1' }],
      });
      await callTurnOffAgentPolicyFeatures();
      expect(logger.error).toHaveBeenLastCalledWith(
        'Done - 1 out of 2 were successful. Errors encountered:\nPolicy [policy1] failed to update due to error: error1'
      );
    });
  });
});
