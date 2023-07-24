/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '@kbn/core/server';
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import { cloneDeep } from 'lodash';
import { SavedObjectError } from '@kbn/core-saved-objects-common';
import { getAgentPoliciesAsInternalUser } from '../../routes/settings/private_locations/get_agent_policies';
import { SyntheticsServerSetup } from '../../types';
import { formatSyntheticsPolicy } from '../formatters/private_formatters/format_synthetics_policy';
import {
  ConfigKey,
  HeartbeatConfig,
  MonitorFields,
  SourceType,
} from '../../../common/runtime_types';
import { stringifyString } from '../formatters/private_formatters/formatting_utils';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';

export interface PrivateConfig {
  config: HeartbeatConfig;
  globalParams: Record<string, string>;
}

export interface FailedPolicyUpdate {
  packagePolicy: NewPackagePolicyWithId;
  config?: HeartbeatConfig;
  error?: Error | SavedObjectError;
}

export class SyntheticsPrivateLocation {
  private readonly server: SyntheticsServerSetup;

  constructor(_server: SyntheticsServerSetup) {
    this.server = _server;
  }

  async buildNewPolicy(): Promise<NewPackagePolicy> {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();

    const newPolicy = await this.server.fleet.packagePolicyService.buildPackagePolicyFromPackage(
      soClient,
      'synthetics',
      this.server.logger
    );

    if (!newPolicy) {
      throw new Error(`Unable to create Synthetics package policy template for private location`);
    }

    return newPolicy;
  }

  getPolicyId(config: HeartbeatConfig, locId: string, spaceId: string) {
    if (config[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
      return `${config.id}-${locId}`;
    }
    return `${config.id}-${locId}-${spaceId}`;
  }

  generateNewPolicy(
    config: HeartbeatConfig,
    privateLocation: PrivateLocationAttributes,
    newPolicyTemplate: NewPackagePolicy,
    spaceId: string,
    globalParams: Record<string, string>
  ): (NewPackagePolicy & { policy_id: string }) | null {
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

      const { formattedPolicy } = formatSyntheticsPolicy(
        newPolicy,
        config.type,
        {
          ...(config as Partial<MonitorFields>),
          config_id: config.fields?.config_id,
          location_name: stringifyString(privateLocation.label),
          location_id: privateLocation.id,
          'monitor.project.id': stringifyString(config.fields?.['monitor.project.name']),
          'monitor.project.name': stringifyString(config.fields?.['monitor.project.name']),
        },
        globalParams
      );

      return formattedPolicy;
    } catch (e) {
      this.server.logger.error(e);
      return null;
    }
  }

  async createPackagePolicies(
    configs: PrivateConfig[],
    request: KibanaRequest,
    privateLocations: PrivateLocationAttributes[],
    spaceId: string
  ) {
    if (configs.length === 0) {
      return { created: [], failed: [] };
    }

    const newPolicies: NewPackagePolicyWithId[] = [];

    const newPolicyTemplate = await this.buildNewPolicy();

    for (const { config, globalParams } of configs) {
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
            newPolicyTemplate,
            spaceId,
            globalParams
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
        throw e;
      }
    }

    if (newPolicies.length === 0) {
      throw new Error('Failed to build package policies for all monitors');
    }

    try {
      return await this.createPolicyBulk(newPolicies);
    } catch (e) {
      this.server.logger.error(e);
      throw e;
    }
  }

  async inspectPackagePolicy({
    privateConfig,
    spaceId,
    allPrivateLocations,
  }: {
    privateConfig?: PrivateConfig;
    allPrivateLocations: PrivateLocationAttributes[];
    spaceId: string;
  }) {
    if (!privateConfig) {
      return null;
    }
    const newPolicyTemplate = await this.buildNewPolicy();
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();

    const { config, globalParams } = privateConfig;
    try {
      const { locations } = config;

      const privateLocation = locations.find((loc) => !loc.isServiceManaged);

      const location = allPrivateLocations?.find((loc) => loc.id === privateLocation?.id)!;

      const newPolicy = this.generateNewPolicy(
        config,
        location,
        newPolicyTemplate,
        spaceId,
        globalParams
      );

      const pkgPolicy = {
        ...newPolicy,
        id: this.getPolicyId(config, location.id, spaceId),
      } as NewPackagePolicyWithId;

      return await this.server.fleet.packagePolicyService.inspect(soClient, pkgPolicy);
    } catch (e) {
      this.server.logger.error(e);
      return null;
    }
  }

  async editMonitors(
    configs: Array<{ config: HeartbeatConfig; globalParams: Record<string, string> }>,
    request: KibanaRequest,
    allPrivateLocations: PrivateLocationAttributes[],
    spaceId: string
  ) {
    if (configs.length === 0) {
      return {};
    }

    const newPolicyTemplate = await this.buildNewPolicy();

    const policiesToUpdate: NewPackagePolicyWithId[] = [];
    const policiesToCreate: NewPackagePolicyWithId[] = [];
    const policiesToDelete: string[] = [];

    const existingPolicies = await this.getExistingPolicies(
      configs.map(({ config }) => config),
      allPrivateLocations,
      spaceId
    );

    for (const { config, globalParams } of configs) {
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
              newPolicyTemplate,
              spaceId,
              globalParams
            );

            if (!newPolicy) {
              throwAddEditError(hasPolicy, privateLocation.label);
            }

            if (hasPolicy) {
              policiesToUpdate.push({ ...newPolicy, id: currId } as NewPackagePolicyWithId);
            } else {
              policiesToCreate.push({ ...newPolicy, id: currId } as NewPackagePolicyWithId);
            }
          } else if (hasPolicy) {
            policiesToDelete.push(currId);
          }
        } catch (e) {
          this.server.logger.error(e);
          throwAddEditError(hasPolicy, privateLocation.label, config[ConfigKey.NAME]);
        }
      }
    }

    const [_createResponse, failedUpdatesRes, _deleteResponse] = await Promise.all([
      this.createPolicyBulk(policiesToCreate),
      this.updatePolicyBulk(policiesToUpdate),
      this.deletePolicyBulk(policiesToDelete),
    ]);

    const failedUpdates = failedUpdatesRes?.map(({ packagePolicy, error }) => {
      const policyConfig = configs.find(({ config }) => {
        const { locations } = config;

        const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);
        for (const privateLocation of monitorPrivateLocations) {
          const currId = this.getPolicyId(config, privateLocation.id, spaceId);
          return currId === packagePolicy.id;
        }
      });
      return {
        error,
        packagePolicy,
        config: policyConfig?.config,
      };
    });

    return {
      failedUpdates,
    };
  }

  async getExistingPolicies(
    configs: HeartbeatConfig[],
    allPrivateLocations: PrivateLocationAttributes[],
    spaceId: string
  ) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();

    const listOfPolicies: string[] = [];
    for (const config of configs) {
      for (const privateLocation of allPrivateLocations) {
        const currId = this.getPolicyId(config, privateLocation.id, spaceId);
        listOfPolicies.push(currId);
      }
    }
    return (
      (await this.server.fleet.packagePolicyService.getByIDs(soClient, listOfPolicies, {
        ignoreMissing: true,
      })) ?? []
    );
  }

  async createPolicyBulk(newPolicies: NewPackagePolicyWithId[]) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (esClient && newPolicies.length > 0) {
      return await this.server.fleet.packagePolicyService.bulkCreate(
        soClient,
        esClient,
        newPolicies
      );
    }
  }

  async updatePolicyBulk(policiesToUpdate: NewPackagePolicyWithId[]) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (soClient && esClient && policiesToUpdate.length > 0) {
      const { failedPolicies } = await this.server.fleet.packagePolicyService.bulkUpdate(
        soClient,
        esClient,
        policiesToUpdate,
        {
          force: true,
        }
      );
      return failedPolicies;
    }
  }

  async deletePolicyBulk(policyIdsToDelete: string[]) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
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

  async deleteMonitors(configs: HeartbeatConfig[], request: KibanaRequest, spaceId: string) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const esClient = this.server.uptimeEsClient.baseESClient;

    const policyIdsToDelete = [];
    for (const config of configs) {
      const { locations } = config;

      const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const privateLocation of monitorPrivateLocations) {
        try {
          policyIdsToDelete.push(this.getPolicyId(config, privateLocation.id, spaceId));
        } catch (e) {
          this.server.logger.error(e);
          throw new Error(deletePolicyError(config[ConfigKey.NAME], privateLocation.label));
        }
      }
    }
    if (policyIdsToDelete.length > 0) {
      const result = await this.server.fleet.packagePolicyService.delete(
        soClient,
        esClient,
        policyIdsToDelete,
        {
          force: true,
        }
      );
      const failedPolicies = result?.filter((policy) => !policy.success);
      if (failedPolicies?.length === policyIdsToDelete.length) {
        throw new Error(deletePolicyError(configs[0][ConfigKey.NAME]));
      }
      return result;
    }
  }

  async getAgentPolicies() {
    const agentPolicies = await getAgentPoliciesAsInternalUser(this.server);

    return agentPolicies.items;
  }
}

const throwAddEditError = (hasPolicy: boolean, location?: string, name?: string) => {
  throw new Error(
    `Unable to ${hasPolicy ? 'update' : 'create'} Synthetics package policy ${
      name ? 'for monitor ' + name : ''
    } for private location: ${location}`
  );
};

const deletePolicyError = (name: string, location?: string) => {
  return `Unable to delete Synthetics package policy for monitor ${name} with private location ${location}`;
};
