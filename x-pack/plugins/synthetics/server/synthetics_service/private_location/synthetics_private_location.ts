/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '@kbn/core/server';
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { formatSyntheticsPolicy } from '../../../common/formatters/format_synthetics_policy';
import { getSyntheticsPrivateLocations } from '../../legacy_uptime/lib/saved_objects/private_locations';
import {
  ConfigKey,
  MonitorFields,
  PrivateLocation,
  HeartbeatConfig,
  SourceType,
} from '../../../common/runtime_types';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';

export class SyntheticsPrivateLocation {
  private readonly server: UptimeServerSetup;

  constructor(_server: UptimeServerSetup) {
    this.server = _server;
  }

  getSpaceId() {
    if (!this.server.currentRequest) {
      return '';
    }

    return this.server.spaces.spacesService.getSpaceId(this.server.currentRequest);
  }

  getPolicyId(config: HeartbeatConfig, { id: locId }: PrivateLocation) {
    if (config[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
      return `${config.id}-${locId}`;
    }
    return `${config.id}-${locId}-${this.getSpaceId()}`;
  }

  async generateNewPolicy(
    config: HeartbeatConfig,
    privateLocation: PrivateLocation
  ): Promise<NewPackagePolicy | null> {
    if (!this.server.authSavedObjectsClient) {
      throw new Error('Could not find authSavedObjectsClient');
    }

    const { label: locName } = privateLocation;
    const spaceId = this.getSpaceId();

    try {
      const newPolicy = await this.server.fleet.packagePolicyService.buildPackagePolicyFromPackage(
        this.server.authSavedObjectsClient,
        'synthetics',
        this.server.logger
      );

      if (!newPolicy) {
        throw new Error(
          `Unable to create Synthetics package policy for private location ${privateLocation.label}`
        );
      }

      newPolicy.is_managed = true;
      newPolicy.policy_id = privateLocation.agentPolicyId;
      if (config[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
        newPolicy.name = `${config.id}-${locName}`;
      } else {
        newPolicy.name = `${config[ConfigKey.NAME]}-${locName}-${spaceId}`;
      }

      newPolicy.output_id = '';
      newPolicy.namespace = 'default';

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

  async createMonitor(config: HeartbeatConfig, request: KibanaRequest) {
    const { locations } = config;

    await this.checkPermissions(
      request,
      `Unable to create Synthetics package policy for monitor ${
        config[ConfigKey.NAME]
      }. Fleet write permissions are needed to use Synthetics private locations.`
    );

    const privateLocations: PrivateLocation[] = await getSyntheticsPrivateLocations(
      this.server.authSavedObjectsClient!
    );

    const fleetManagedLocations = locations.filter((loc) => !loc.isServiceManaged);

    for (const privateLocation of fleetManagedLocations) {
      const location = privateLocations?.find((loc) => loc.id === privateLocation.id);

      if (!location) {
        throw new Error(
          `Unable to find Synthetics private location for agentId ${privateLocation.id}`
        );
      }

      const newPolicy = await this.generateNewPolicy(config, location);

      if (!newPolicy) {
        throw new Error(
          `Unable to create Synthetics package policy for monitor ${
            config[ConfigKey.NAME]
          } with private location ${location.label}`
        );
      }

      try {
        await this.createPolicy(newPolicy, this.getPolicyId(config, location));
      } catch (e) {
        this.server.logger.error(e);
        throw new Error(
          `Unable to create Synthetics package policy for monitor ${
            config[ConfigKey.NAME]
          } with private location ${location.label}`
        );
      }
    }
  }

  async editMonitor(config: HeartbeatConfig, request: KibanaRequest) {
    await this.checkPermissions(
      request,
      `Unable to update Synthetics package policy for monitor ${
        config[ConfigKey.NAME]
      }. Fleet write permissions are needed to use Synthetics private locations.`
    );

    const { locations } = config;

    const allPrivateLocations = await getSyntheticsPrivateLocations(
      this.server.authSavedObjectsClient!
    );

    const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

    for (const privateLocation of allPrivateLocations) {
      const hasLocation = monitorPrivateLocations?.some((loc) => loc.id === privateLocation.id);
      const currId = this.getPolicyId(config, privateLocation);
      const hasPolicy = await this.getMonitor(currId);
      try {
        if (hasLocation) {
          const newPolicy = await this.generateNewPolicy(config, privateLocation);

          if (!newPolicy) {
            throw new Error(
              `Unable to ${
                hasPolicy ? 'update' : 'create'
              } Synthetics package policy for private location ${privateLocation.label}`
            );
          }

          if (hasPolicy) {
            await this.updatePolicy(newPolicy, currId);
          } else {
            await this.createPolicy(newPolicy, currId);
          }
        } else if (hasPolicy) {
          const soClient = this.server.authSavedObjectsClient!;
          const esClient = this.server.uptimeEsClient.baseESClient;
          try {
            await this.server.fleet.packagePolicyService.delete(soClient, esClient, [currId], {
              force: true,
            });
          } catch (e) {
            this.server.logger.error(e);
            throw new Error(
              `Unable to delete Synthetics package policy for monitor ${
                config[ConfigKey.NAME]
              } with private location ${privateLocation.label}`
            );
          }
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
      this.server.logger.debug(e);
      return null;
    }
  }

  async deleteMonitor(config: HeartbeatConfig, request: KibanaRequest) {
    const soClient = this.server.authSavedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;

    if (soClient && esClient) {
      const { locations } = config;

      const allPrivateLocations: PrivateLocation[] = await getSyntheticsPrivateLocations(soClient);

      const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const privateLocation of monitorPrivateLocations) {
        const location = allPrivateLocations?.find((loc) => loc.id === privateLocation.id);
        if (location) {
          await this.checkPermissions(
            request,
            `Unable to delete Synthetics package policy for monitor ${
              config[ConfigKey.NAME]
            }. Fleet write permissions are needed to use Synthetics private locations.`
          );

          try {
            await this.server.fleet.packagePolicyService.delete(
              soClient,
              esClient,
              [this.getPolicyId(config, location)],
              {
                force: true,
              }
            );
          } catch (e) {
            this.server.logger.error(e);
            throw new Error(
              `Unable to delete Synthetics package policy for monitor ${
                config[ConfigKey.NAME]
              } with private location ${location.label}`
            );
          }
        }
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
