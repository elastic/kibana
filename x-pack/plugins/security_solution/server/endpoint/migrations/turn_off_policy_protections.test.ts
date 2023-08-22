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
import type { AppFeatures } from '../../lib/app_features';
import { createAppFeaturesMock } from '../../lib/app_features/mocks';
import { ALL_APP_FEATURE_KEYS } from '../../../common';
import { turnOffPolicyProtectionsIfNotSupported } from './turn_off_policy_protections';
import { FleetPackagePolicyGenerator } from '../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyData } from '../../../common/endpoint/types';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { PromiseResolvedValue } from '../../../common/endpoint/types/utility_types';
import { ensureOnlyEventCollectionIsAllowed } from '../../../common/endpoint/models/policy_config_helpers';

describe('Turn Off Policy Protections Migration', () => {
  let esClient: ElasticsearchClient;
  let fleetServices: EndpointInternalFleetServicesInterface;
  let appFeatures: AppFeatures;
  let logger: Logger;

  const callTurnOffPolicyProtections = () =>
    // FIXME: appFeatures is not typed as AppFeaturesService
    // @ts-expect-error
    turnOffPolicyProtectionsIfNotSupported(esClient, fleetServices, appFeatures, logger);

  beforeEach(() => {
    const endpointContextStartContract = createMockEndpointAppContextServiceStartContract();

    // FIXME: appFeatures is not typed as AppFeaturesService
    // @ts-expect-error
    ({ esClient, appFeatures, logger } = endpointContextStartContract);
    fleetServices = endpointContextStartContract.endpointFleetServicesFactory.asInternalUser();
  });

  describe('and `endpointPolicyProtections` is enabled', () => {
    it('should do nothing', async () => {
      await callTurnOffPolicyProtections();

      expect(fleetServices.packagePolicy.list as jest.Mock).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenLastCalledWith(
        'App feature [endpoint_policy_protections] is enabled. Nothing to do!'
      );
    });
  });

  describe('and `endpointPolicyProtections` is disabled', () => {
    let policyGenerator: FleetPackagePolicyGenerator;
    let page1Items: PolicyData[] = [];
    let page2Items: PolicyData[] = [];
    let bulkUpdateResponse: PromiseResolvedValue<ReturnType<PackagePolicyClient['bulkUpdate']>>;

    const generatePolicyMock = (withDisabledProtections = false): PolicyData => {
      const policy = policyGenerator.generateEndpointPackagePolicy();

      if (!withDisabledProtections) {
        return policy;
      }

      policy.inputs[0].config.policy.value = ensureOnlyEventCollectionIsAllowed(
        policy.inputs[0].config.policy.value
      );

      return policy;
    };

    beforeEach(() => {
      policyGenerator = new FleetPackagePolicyGenerator('seed');
      const packagePolicyListSrv = fleetServices.packagePolicy.list as jest.Mock;

      appFeatures = createAppFeaturesMock(
        ALL_APP_FEATURE_KEYS.filter((key) => key !== 'endpoint_policy_protections')
      );

      page1Items = [generatePolicyMock(), generatePolicyMock(true)];
      page2Items = [generatePolicyMock(true), generatePolicyMock()];

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
});
