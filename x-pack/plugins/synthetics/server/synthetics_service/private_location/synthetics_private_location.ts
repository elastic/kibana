/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicy, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { SyntheticsConfig } from '../formatters/format_configs';
import { formatSyntheticsPolicy } from '../../../common/formatters/format_synthetics_policy';
import { getSyntheticsPrivateLocations } from '../../legacy_uptime/lib/saved_objects/private_locations';
import {
  MonitorFields,
  PrivateLocation,
  SyntheticsMonitorWithId,
} from '../../../common/runtime_types';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';

const getPolicyId = (config: SyntheticsMonitorWithId, privateLocation: PrivateLocation) =>
  config.id + '-' + privateLocation.id;

export class SyntheticsPrivateLocation {
  private readonly server: UptimeServerSetup;

  constructor(_server: UptimeServerSetup) {
    this.server = _server;
  }

  async generateNewPolicy(
    config: SyntheticsMonitorWithId,
    privateLocation: PrivateLocation
  ): Promise<NewPackagePolicy> {
    const newPolicy = await this.server.fleet.packagePolicyService.buildPackagePolicyFromPackage(
      this.server.savedObjectsClient!,
      'synthetics'
    );

    if (!newPolicy) {
      throw new Error('Could not create new policy');
    }

    newPolicy.is_managed = true;
    newPolicy.policy_id = privateLocation.policyHostId;
    newPolicy.name = getPolicyId(config, privateLocation);
    newPolicy.output_id = '';
    newPolicy.namespace = 'default';

    const { formattedPolicy } = formatSyntheticsPolicy(newPolicy, config.type, {
      ...(config as Partial<MonitorFields>),
      config_id: config.id,
      location_name: privateLocation.name,
    });

    return formattedPolicy;
  }

  async createMonitor(config: SyntheticsMonitorWithId) {
    const { locations } = config;

    const privateLocations = await getSyntheticsPrivateLocations(
      this.server.authSavedObjectsClient!
    );

    const fleetManagedLocations = locations.filter((loc) => !loc.isServiceManaged);

    for (const privateLocation of fleetManagedLocations) {
      const location = privateLocations?.find((loc) => loc.id === privateLocation.id)!;
      const newPolicy = await this.generateNewPolicy(config, location);

      await this.createPolicy(newPolicy, getPolicyId(config, location));
    }
  }

  async editMonitor(config: SyntheticsConfig) {
    const { locations } = config;

    const allPrivateLocations = await getSyntheticsPrivateLocations(
      this.server.authSavedObjectsClient!
    );

    const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

    for (const privateLocation of allPrivateLocations) {
      const hasLocation = monitorPrivateLocations?.some((loc) => loc.id === privateLocation.id);
      const currId = getPolicyId(config, privateLocation);
      const hasPolicy = await this.getMonitor(currId);

      if (hasLocation) {
        const newPolicy = await this.generateNewPolicy(config, privateLocation);

        if (hasPolicy) {
          await this.updatePolicy(newPolicy, currId);
        } else {
          await this.createPolicy(newPolicy, currId);
        }
      } else if (hasPolicy) {
        const soClient = this.server.authSavedObjectsClient!;
        const esClient = this.server.uptimeEsClient.baseESClient;
        await this.server.fleet.packagePolicyService.delete(soClient, esClient, [currId], {
          force: true,
        });
      }
    }
  }

  async createPolicy(newPolicy: NewPackagePolicy, id: string) {
    const soClient = this.server.authSavedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (soClient && esClient) {
      return await this.server.fleet.packagePolicyService.create(soClient, esClient, newPolicy, {
        id,
        overwrite: true,
      });
    }
  }

  async updatePolicy(updatedPolicy: NewPackagePolicy, id: string) {
    const soClient = this.server.authSavedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (soClient && esClient) {
      return await this.server.fleet.packagePolicyService.update(
        soClient,
        esClient,
        id,
        updatedPolicy,
        {
          force: true,
        }
      );
    }
  }

  async getMonitor(id: string) {
    try {
      const soClient = this.server.authSavedObjectsClient;
      return await this.server.fleet.packagePolicyService.get(soClient!, id);
    } catch (e) {
      return;
    }
  }

  async findMonitor(config: SyntheticsMonitorWithId) {
    const soClient = this.server.authSavedObjectsClient;
    const list = await this.server.fleet.packagePolicyService.list(soClient!, {
      page: 1,
      perPage: 10000,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:synthetics`,
    });

    const { locations } = config;

    const fleetManagedLocationIds = locations
      .filter((loc) => !loc.isServiceManaged)
      .map((loc) => config.id + '-' + loc.id);

    return list.items.filter((policy) => {
      return fleetManagedLocationIds.includes(policy.name);
    });
  }

  async deleteMonitor(config: SyntheticsMonitorWithId) {
    const { locations } = config;

    const fleetManagedLocationIds = locations.filter((loc) => !loc.isServiceManaged);

    const soClient = this.server.authSavedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (soClient && esClient && fleetManagedLocationIds.length > 0) {
      const privateLocations = await getSyntheticsPrivateLocations(soClient);

      for (const privateLocation of fleetManagedLocationIds) {
        const location = privateLocations?.find((loc) => loc.id === privateLocation.id)!;
        await this.server.fleet.packagePolicyService.delete(
          soClient,
          esClient,
          [getPolicyId(config, location)],
          {
            force: true,
          }
        );
      }
    }
  }

  async getAgentPolicies() {
    const agentPolicies = await this.server.fleet.agentPolicyService.list(
      this.server.savedObjectsClient!,
      {
        page: 1,
        perPage: 10000,
      }
    );

    return agentPolicies.items;
  }
}
