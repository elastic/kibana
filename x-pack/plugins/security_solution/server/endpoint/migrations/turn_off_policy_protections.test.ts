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

import { ALL_PRODUCT_FEATURE_KEYS } from '@kbn/security-solution-features/keys';
import { turnOffPolicyProtectionsIfNotSupported } from './turn_off_policy_protections';
import { FleetPackagePolicyGenerator } from '../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyData } from '../../../common/endpoint/types';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { PromiseResolvedValue } from '../../../common/endpoint/types/utility_types';
import { ensureOnlyEventCollectionIsAllowed } from '../../../common/endpoint/models/policy_config_helpers';
import type { ProductFeaturesService } from '../../lib/product_features_service/product_features_service';
import { createProductFeaturesServiceMock } from '../../lib/product_features_service/mocks';

describe('Turn Off Policy Protections Migration', () => {
  let esClient: ElasticsearchClient;
  let fleetServices: EndpointInternalFleetServicesInterface;
  let productFeatureService: ProductFeaturesService;
  let logger: Logger;

  const callTurnOffPolicyProtections = () =>
    turnOffPolicyProtectionsIfNotSupported(esClient, fleetServices, productFeatureService, logger);

  const generatePolicyMock = (
    policyGenerator: FleetPackagePolicyGenerator,
    withDisabledProtections = false,
    withDisabledProtectionUpdates = true
  ): PolicyData => {
    const policy = policyGenerator.generateEndpointPackagePolicy();

    if (!withDisabledProtections && withDisabledProtectionUpdates) {
      return policy;
    } else if (!withDisabledProtections && !withDisabledProtectionUpdates) {
      policy.inputs[0].config.policy.value.global_manifest_version = '2023-01-01';
      return policy;
    } else if (withDisabledProtections && !withDisabledProtectionUpdates) {
      policy.inputs[0].config.policy.value = ensureOnlyEventCollectionIsAllowed(
        policy.inputs[0].config.policy.value
      );
      policy.inputs[0].config.policy.value.global_manifest_version = '2023-01-01';
      return policy;
    } else {
      policy.inputs[0].config.policy.value = ensureOnlyEventCollectionIsAllowed(
        policy.inputs[0].config.policy.value
      );
      return policy; // This is the only one that shouldn't be updated since it has default values for disabled features
    }
  };

  beforeEach(() => {
    const endpointContextStartContract = createMockEndpointAppContextServiceStartContract();

    ({ esClient, logger } = endpointContextStartContract);

    productFeatureService = endpointContextStartContract.productFeaturesService;
    fleetServices = endpointContextStartContract.endpointFleetServicesFactory.asInternalUser();
  });

  describe('and both `endpointPolicyProtections` and `endpointProtectionUpdates` is enabled', () => {
    it('should do nothing', async () => {
      await callTurnOffPolicyProtections();

      expect(fleetServices.packagePolicy.list as jest.Mock).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        'App feature [endpoint_policy_protections] is enabled. Nothing to do!'
      );
      expect(logger.info).toHaveBeenLastCalledWith(
        'App feature [endpoint_protection_updates] is enabled. Nothing to do!'
      );
    });
  });

  describe('and `endpointProtectionUpdates` is disabled but `endpointPolicyProtections` is enabled', () => {
    let policyGenerator: FleetPackagePolicyGenerator;
    let page1Items: PolicyData[] = [];
    let page2Items: PolicyData[] = [];
    let bulkUpdateResponse: PromiseResolvedValue<ReturnType<PackagePolicyClient['bulkUpdate']>>;

    beforeEach(() => {
      policyGenerator = new FleetPackagePolicyGenerator('seed');
      const packagePolicyListSrv = fleetServices.packagePolicy.list as jest.Mock;

      productFeatureService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_protection_updates')
      );

      page1Items = [
        generatePolicyMock(policyGenerator, false),
        generatePolicyMock(policyGenerator, false, false),
      ];
      page2Items = [
        generatePolicyMock(policyGenerator, false, false),
        generatePolicyMock(policyGenerator, false),
      ];

      packagePolicyListSrv
        .mockImplementationOnce(async () => {
          return {
            total: 1500,
            page: 1,
            perPage: 1000,
            items: page1Items,
          };
        })
        .mockImplementationOnce(async () => {
          return {
            total: 1500,
            page: 2,
            perPage: 1000,
            items: page2Items,
          };
        });

      bulkUpdateResponse = {
        updatedPolicies: [page1Items[1], page2Items[0]],
        failedPolicies: [],
      };

      (fleetServices.packagePolicy.bulkUpdate as jest.Mock).mockImplementation(async () => {
        return bulkUpdateResponse;
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update only policies that have non default manifest versions set', async () => {
      await callTurnOffPolicyProtections();

      expect(fleetServices.packagePolicy.list as jest.Mock).toHaveBeenCalledTimes(2);
      expect(fleetServices.packagePolicy.bulkUpdate as jest.Mock).toHaveBeenCalledWith(
        fleetServices.internalSoClient,
        esClient,
        [
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![0].id }),
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![1].id }),
        ],
        { user: { username: 'elastic' } }
      );
    });
  });

  describe('and `endpointPolicyProtections` is disabled, but `endpointProtectionUpdates` is enabled', () => {
    let policyGenerator: FleetPackagePolicyGenerator;
    let page1Items: PolicyData[] = [];
    let page2Items: PolicyData[] = [];
    let bulkUpdateResponse: PromiseResolvedValue<ReturnType<PackagePolicyClient['bulkUpdate']>>;

    beforeEach(() => {
      policyGenerator = new FleetPackagePolicyGenerator('seed');
      const packagePolicyListSrv = fleetServices.packagePolicy.list as jest.Mock;

      productFeatureService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_policy_protections')
      );

      page1Items = [
        generatePolicyMock(policyGenerator, false, false),
        generatePolicyMock(policyGenerator, true, false),
      ];
      page2Items = [
        generatePolicyMock(policyGenerator, true, false),
        generatePolicyMock(policyGenerator, false, false),
      ];

      packagePolicyListSrv
        .mockImplementationOnce(async () => {
          return {
            total: 1500,
            page: 1,
            perPage: 1000,
            items: page1Items,
          };
        })
        .mockImplementationOnce(async () => {
          return {
            total: 1500,
            page: 2,
            perPage: 1000,
            items: page2Items,
          };
        });

      bulkUpdateResponse = {
        updatedPolicies: [page1Items[0], page2Items[1]],
        failedPolicies: [],
      };

      (fleetServices.packagePolicy.bulkUpdate as jest.Mock).mockImplementation(async () => {
        return bulkUpdateResponse;
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update only policies that have protections turn on', async () => {
      await callTurnOffPolicyProtections();

      expect(fleetServices.packagePolicy.list as jest.Mock).toHaveBeenCalledTimes(2);
      expect(fleetServices.packagePolicy.bulkUpdate as jest.Mock).toHaveBeenCalledWith(
        fleetServices.internalSoClient,
        esClient,
        [
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![0].id }),
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![1].id }),
        ],
        { user: { username: 'elastic' } }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Found 2 policies that need updates:\n' +
          `Policy [${bulkUpdateResponse.updatedPolicies![0].id}][${
            bulkUpdateResponse.updatedPolicies![0].name
          }] updated to disable protections. Trigger: [property [mac.malware.mode] is set to [prevent]]\n` +
          `Policy [${bulkUpdateResponse.updatedPolicies![1].id}][${
            bulkUpdateResponse.updatedPolicies![1].name
          }] updated to disable protections. Trigger: [property [mac.malware.mode] is set to [prevent]]`
      );
      expect(logger.info).toHaveBeenCalledWith('Done. All updates applied successfully');
    });

    it('should log failures', async () => {
      bulkUpdateResponse.failedPolicies.push({
        error: new Error('oh oh'),
        packagePolicy: bulkUpdateResponse.updatedPolicies![0],
      });
      await callTurnOffPolicyProtections();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Done. 1 out of 2 failed to update:')
      );
    });
  });

  describe('and both `endpointPolicyProtections` and `endpointProtectionUpdates` is disabled', () => {
    let policyGenerator: FleetPackagePolicyGenerator;
    let page1Items: PolicyData[] = [];
    let page2Items: PolicyData[] = [];
    let bulkUpdateResponse: PromiseResolvedValue<ReturnType<PackagePolicyClient['bulkUpdate']>>;

    beforeEach(() => {
      policyGenerator = new FleetPackagePolicyGenerator('seed');
      const packagePolicyListSrv = fleetServices.packagePolicy.list as jest.Mock;

      productFeatureService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter(
          (key) => key !== 'endpoint_policy_protections' && key !== 'endpoint_protection_updates'
        )
      );

      page1Items = [
        generatePolicyMock(policyGenerator),
        generatePolicyMock(policyGenerator, true), // This is the only one that shouldn't be updated since it has default values for disabled features
        generatePolicyMock(policyGenerator, true, false),
        generatePolicyMock(policyGenerator, false, false),
      ];

      page2Items = [
        generatePolicyMock(policyGenerator, false, false),
        generatePolicyMock(policyGenerator, true, false),
        generatePolicyMock(policyGenerator, true), // This is the only one that shouldn't be updated since it has default values for disabled features
        generatePolicyMock(policyGenerator),
      ];

      packagePolicyListSrv
        .mockImplementationOnce(async () => {
          return {
            total: 1500,
            page: 1,
            perPage: 1000,
            items: page1Items,
          };
        })
        .mockImplementationOnce(async () => {
          return {
            total: 1500,
            page: 2,
            perPage: 1000,
            items: page2Items,
          };
        });

      bulkUpdateResponse = {
        updatedPolicies: [
          page1Items[0],
          page1Items[2],
          page1Items[3],
          page2Items[0],
          page2Items[1],
          page2Items[3],
        ],
        failedPolicies: [],
      };

      (fleetServices.packagePolicy.bulkUpdate as jest.Mock).mockImplementation(async () => {
        return bulkUpdateResponse;
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update only policies that have protections and protection updates turned on', async () => {
      await callTurnOffPolicyProtections();

      expect(fleetServices.packagePolicy.list as jest.Mock).toHaveBeenCalledTimes(2);
      expect(fleetServices.packagePolicy.bulkUpdate as jest.Mock).toHaveBeenCalledWith(
        fleetServices.internalSoClient,
        esClient,
        [
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![0].id }),
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![1].id }),
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![2].id }),
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![3].id }),
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![4].id }),
          expect.objectContaining({ id: bulkUpdateResponse.updatedPolicies![5].id }),
        ],
        { user: { username: 'elastic' } }
      );
    });
  });
});
