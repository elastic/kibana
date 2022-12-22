/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import { cloneDeep } from 'lodash';
import { formatSyntheticsPolicy } from '../../../common/formatters/format_synthetics_policy';
import {
  ConfigKey,
  HeartbeatConfig,
  MonitorFields,
  PrivateLocation,
  SourceType,
} from '../../../common/runtime_types';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';

export class SyntheticsPrivateLocation {
  private readonly server: UptimeServerSetup;

  constructor(_server: UptimeServerSetup) {
    this.server = _server;
  }

  async buildNewPolicy(
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<NewPackagePolicy | undefined> {
    return await this.server.fleet.packagePolicyService.buildPackagePolicyFromPackage(
      savedObjectsClient,
      'synthetics',
      this.server.logger
    );
  }

  getPolicyId(config: HeartbeatConfig, locId: string, spaceId: string) {
    if (config[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
      return `${config.id}-${locId}`;
    }
    return `${config.id}-${locId}-${spaceId}`;
  }

  generateNewPolicy(
    config: HeartbeatConfig,
    privateLocation: PrivateLocation,
    savedObjectsClient: SavedObjectsClientContract,
    newPolicyTemplate: NewPackagePolicy,
    spaceId: string
  ): NewPackagePolicy | null {
    if (!savedObjectsClient) {
      throw new Error('Could not find savedObjectsClient');
    }

    const { label: locName } = privateLocation;

    const newPolicy = cloneDeep(newPolicyTemplate);

    try {
      newPolicy.is_managed = true;
      newPolicy.policy_id = privateLocation.agentPolicyId;
      if (config[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
        newPolicy.name = `${config.id}-${locName}`;
      } else {
        newPolicy.name = `${config[ConfigKey.NAME]}-${locName}-${spaceId}`;
      }
      newPolicy.namespace = config[ConfigKey.NAMESPACE];

      const { formattedPolicy } = formatSyntheticsPolicy(newPolicy, config.type, {
        ...(config as Partial<MonitorFields>),
        config_id: config.fields?.config_id,
        location_name: privateLocation.label,
        'monitor.project.id': config.fields?.['monitor.project.name'],
        'monitor.project.name': config.fields?.['monitor.project.name'],
      });

      return formattedPolicy;
    } catch (e) {
      this.server.logger.error(e);
      return null;
    }
  }

  async checkPermissions(request: KibanaRequest, error: string) {
    const {
      integrations: { writeIntegrationPolicies },
    } = await this.server.fleet.authz.fromRequest(request);

    if (!writeIntegrationPolicies) {
      throw new Error(error);
    }
  }

  async createMonitors(
    configs: HeartbeatConfig[],
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract,
    privateLocations: PrivateLocation[],
    spaceId: string
  ) {
    await this.checkPermissions(
      request,
      `Unable to create Synthetics package policy for monitor. Fleet write permissions are needed to use Synthetics private locations.`
    );

    const newPolicies: NewPackagePolicyWithId[] = [];

    const newPolicyTemplate = await this.buildNewPolicy(savedObjectsClient);

    if (!newPolicyTemplate) {
      throw new Error(`Unable to create Synthetics package policy for private location`);
    }

    for (const config of configs) {
      try {
        const { locations } = config;

        const fleetManagedLocations = locations.filter((loc) => !loc.isServiceManaged);

        for (const privateLocation of fleetManagedLocations) {
          const location = privateLocations?.find((loc) => loc.id === privateLocation.id)!;

          if (!location) {
            throw new Error(
              `Unable to find Synthetics private location for agentId ${privateLocation.id}`
            );
          }

          const newPolicy = this.generateNewPolicy(
            config,
            location,
            savedObjectsClient,
            newPolicyTemplate,
            spaceId
          );

          if (!newPolicy) {
            throw new Error(
              `Unable to create Synthetics package policy for monitor ${
                config[ConfigKey.NAME]
              } with private location ${location.label}`
            );
          }
          if (newPolicy) {
            newPolicies.push({ ...newPolicy, id: this.getPolicyId(config, location.id, spaceId) });
          }
        }
      } catch (e) {
        this.server.logger.error(e);
      }
    }

    if (newPolicies.length === 0) {
      throw new Error('Failed to build package policies for all monitors');
    }

    try {
      return await this.createPolicyBulk(newPolicies, savedObjectsClient);
    } catch (e) {
      this.server.logger.error(e);
    }
  }

  async editMonitors(
    configs: HeartbeatConfig[],
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract,
    allPrivateLocations: PrivateLocation[],
    spaceId: string
  ) {
    await this.checkPermissions(
      request,
      `Unable to update Synthetics package policy for monitor. Fleet write permissions are needed to use Synthetics private locations.`
    );

    const newPolicyTemplate = await this.buildNewPolicy(savedObjectsClient);

    if (!newPolicyTemplate) {
      throw new Error(`Unable to create Synthetics package policy for private location`);
    }

    const policiesToUpdate: Array<NewPackagePolicy & { version?: string; id: string }> = [];
    const policiesToCreate: NewPackagePolicyWithId[] = [];
    const policiesToDelete: string[] = [];

    const existingPolicies = await this.getExistingPolicies(
      configs,
      allPrivateLocations,
      savedObjectsClient,
      spaceId
    );

    for (const config of configs) {
      const { locations } = config;

      const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const privateLocation of allPrivateLocations) {
        const hasLocation = monitorPrivateLocations?.some((loc) => loc.id === privateLocation.id);
        const currId = this.getPolicyId(config, privateLocation.id, spaceId);
        const hasPolicy = existingPolicies?.some((policy) => policy.id === currId);
        try {
          if (hasLocation) {
            const newPolicy = this.generateNewPolicy(
              config,
              privateLocation,
              savedObjectsClient,
              newPolicyTemplate,
              spaceId
            );

            if (!newPolicy) {
              throw new Error(
                `Unable to ${
                  hasPolicy ? 'update' : 'create'
                } Synthetics package policy for private location ${privateLocation.label}`
              );
            }

            if (hasPolicy) {
              policiesToUpdate.push({ ...newPolicy, id: currId });
            } else {
              policiesToCreate.push({ ...newPolicy, id: currId });
            }
          } else if (hasPolicy) {
            policiesToDelete.push(currId);
          }
        } catch (e) {
          this.server.logger.error(e);
          throw new Error(
            `Unable to ${hasPolicy ? 'update' : 'create'} Synthetics package policy for monitor ${
              config[ConfigKey.NAME]
            } with private location ${privateLocation.label}`
          );
        }
      }
    }

    await Promise.all([
      this.createPolicyBulk(policiesToCreate, savedObjectsClient),
      this.updatePolicyBulk(policiesToUpdate, savedObjectsClient),
      this.deletePolicyBulk(policiesToDelete, savedObjectsClient),
    ]);
  }

  async getExistingPolicies(
    configs: HeartbeatConfig[],
    allPrivateLocations: PrivateLocation[],
    savedObjectsClient: SavedObjectsClientContract,
    spaceId: string
  ) {
    const listOfPolicies: string[] = [];
    for (const config of configs) {
      for (const privateLocation of allPrivateLocations) {
        const currId = this.getPolicyId(config, privateLocation.id, spaceId);
        listOfPolicies.push(currId);
      }
    }
    return (
      (await this.server.fleet.packagePolicyService.getByIDs(savedObjectsClient, listOfPolicies, {
        ignoreMissing: true,
      })) ?? []
    );
  }

  async createPolicyBulk(
    newPolicies: NewPackagePolicyWithId[],
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const soClient = savedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (soClient && esClient && newPolicies.length > 0) {
      return await this.server.fleet.packagePolicyService.bulkCreate(
        soClient,
        esClient,
        newPolicies
      );
    }
  }

  async updatePolicyBulk(
    updatedPolicies: Array<NewPackagePolicy & { version?: string; id: string }>,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const soClient = savedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (soClient && esClient && updatedPolicies.length > 0) {
      return await this.server.fleet.packagePolicyService.bulkUpdate(
        soClient,
        esClient,
        updatedPolicies,
        {
          force: true,
        }
      );
    }
  }

  async deletePolicyBulk(
    policyIdsToDelete: string[],
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const soClient = savedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (soClient && esClient && policyIdsToDelete.length > 0) {
      return await this.server.fleet.packagePolicyService.delete(
        soClient,
        esClient,
        policyIdsToDelete,
        {
          force: true,
        }
      );
    }
  }

  async deleteMonitors(
    configs: HeartbeatConfig[],
    request: KibanaRequest,
    soClient: SavedObjectsClientContract,
    spaceId: string
  ) {
    const policyIdsToDelete = [];
    for (const config of configs) {
      const { locations } = config;

      const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const privateLocation of monitorPrivateLocations) {
        await this.checkPermissions(request, deletePermissionError(config[ConfigKey.NAME]));
        try {
          policyIdsToDelete.push(this.getPolicyId(config, privateLocation.id, spaceId));
        } catch (e) {
          this.server.logger.error(e);
          throw new Error(
            `Unable to delete Synthetics package policy for monitor ${
              config[ConfigKey.NAME]
            } with private location ${privateLocation.label}`
          );
        }
      }
    }
    if (policyIdsToDelete.length > 0) {
      await this.checkPermissions(
        request,
        `Unable to delete Synthetics package policy for monitor. Fleet write permissions are needed to use Synthetics private locations.`
      );
      await this.deletePolicyBulk(policyIdsToDelete, soClient);
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

const deletePermissionError = (name: string) => {
  return `Unable to delete Synthetics package policy for monitor ${name}. Fleet write permissions are needed to use Synthetics private locations.`;
};
