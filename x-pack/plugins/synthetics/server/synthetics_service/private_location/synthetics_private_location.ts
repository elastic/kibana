/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import { getPackageInfo } from '@kbn/fleet-plugin/server/services/epm/packages';
import { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
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
  private syntheticsPkgInfo?: PackageInfo;
  private newPackagePolicy?: NewPackagePolicy;
  private privateLocations?: PrivateLocation[];

  private writeIntegrationPoliciesPermissions?: boolean;

  constructor(_server: UptimeServerSetup) {
    this.server = _server;
  }

  async init(savedObjectsClient: SavedObjectsClientContract, request: KibanaRequest) {
    if (!this.syntheticsPkgInfo) {
      this.newPackagePolicy = await this.buildNewPolicy(savedObjectsClient);

      this.syntheticsPkgInfo = await getPackageInfo({
        savedObjectsClient,
        pkgName: this.newPackagePolicy!.package!.name,
        pkgVersion: this.newPackagePolicy!.package!.version,
      });
    }

    const {
      integrations: { writeIntegrationPolicies },
    } = await this.server.fleet.authz.fromRequest(request);

    this.writeIntegrationPoliciesPermissions = writeIntegrationPolicies;

    this.privateLocations = await getSyntheticsPrivateLocations(savedObjectsClient);
  }

  async buildNewPolicy(
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<NewPackagePolicy | undefined> {
    if (this.newPackagePolicy) {
      return { ...this.newPackagePolicy };
    }

    return await this.server.fleet.packagePolicyService.buildPackagePolicyFromPackage(
      savedObjectsClient,
      'synthetics',
      this.server.logger
    );
  }

  getSpaceId(request: KibanaRequest) {
    return this.server.spaces.spacesService.getSpaceId(request);
  }

  getPolicyId(config: HeartbeatConfig, { id: locId }: PrivateLocation, request: KibanaRequest) {
    if (config[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
      return `${config.id}-${locId}`;
    }
    return `${config.id}-${locId}-${this.getSpaceId(request)}`;
  }

  async generateNewPolicy(
    config: HeartbeatConfig,
    privateLocation: PrivateLocation,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<NewPackagePolicy | null> {
    if (!savedObjectsClient) {
      throw new Error('Could not find savedObjectsClient');
    }

    const { label: locName } = privateLocation;
    const spaceId = this.getSpaceId(request);

    try {
      const newPolicy = await this.buildNewPolicy(savedObjectsClient);

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
    if (!this.writeIntegrationPoliciesPermissions) {
      console.log(this.writeIntegrationPoliciesPermissions);

      const {
        integrations: { writeIntegrationPolicies },
      } = await this.server.fleet.authz.fromRequest(request);

      if (!writeIntegrationPolicies) {
        throw new Error(error);
      }
    }
  }

  async createMonitor(
    config: HeartbeatConfig,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const { locations } = config;

    // await this.checkPermissions(
    //   request,
    //   `Unable to create Synthetics package policy for monitor ${
    //     config[ConfigKey.NAME]
    //   }. Fleet write permissions are needed to use Synthetics private locations.`
    // );

    const privateLocations: PrivateLocation[] =
      this.privateLocations ?? (await getSyntheticsPrivateLocations(savedObjectsClient));

    const fleetManagedLocations = locations.filter((loc) => !loc.isServiceManaged);

    for (const privateLocation of fleetManagedLocations) {
      const location = privateLocations?.find((loc) => loc.id === privateLocation.id);

      if (!location) {
        throw new Error(
          `Unable to find Synthetics private location for agentId ${privateLocation.id}`
        );
      }

      const newPolicy = await this.generateNewPolicy(config, location, request, savedObjectsClient);

      if (!newPolicy) {
        throw new Error(
          `Unable to create Synthetics package policy for monitor ${
            config[ConfigKey.NAME]
          } with private location ${location.label}`
        );
      }

      try {
        await this.createPolicy(
          newPolicy,
          this.getPolicyId(config, location, request),
          savedObjectsClient
        );
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

  async createMonitorBulk(
    configs: HeartbeatConfig[],
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const newPolicies: NewPackagePolicyWithId[] = [];
    for (const config of configs) {
      const { locations } = config;

      const privateLocations: PrivateLocation[] =
        this.privateLocations ?? (await getSyntheticsPrivateLocations(savedObjectsClient));

      const fleetManagedLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const privateLocation of fleetManagedLocations) {
        const location = privateLocations?.find((loc) => loc.id === privateLocation.id)!;

        const newPolicy = await this.generateNewPolicy(
          config,
          location,
          request,
          savedObjectsClient
        );
        if (newPolicy) {
          newPolicies.push({ ...newPolicy, id: this.getPolicyId(config, location, request) });
        }
      }
    }

    try {
      await this.createPolicyBulk(newPolicies, savedObjectsClient);
    } catch (e) {
      this.server.logger.error(e);
    }
  }

  async editMonitor(
    config: HeartbeatConfig,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    await this.checkPermissions(
      request,
      `Unable to update Synthetics package policy for monitor ${
        config[ConfigKey.NAME]
      }. Fleet write permissions are needed to use Synthetics private locations.`
    );

    const { locations } = config;

    const allPrivateLocations =
      this.privateLocations ?? (await getSyntheticsPrivateLocations(savedObjectsClient));

    const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

    for (const privateLocation of allPrivateLocations) {
      const hasLocation = monitorPrivateLocations?.some((loc) => loc.id === privateLocation.id);
      const currId = this.getPolicyId(config, privateLocation, request);
      const hasPolicy = await this.getMonitor(currId, savedObjectsClient);
      try {
        if (hasLocation) {
          const newPolicy = await this.generateNewPolicy(
            config,
            privateLocation,
            request,
            savedObjectsClient
          );

          if (!newPolicy) {
            throw new Error(
              `Unable to ${
                hasPolicy ? 'update' : 'create'
              } Synthetics package policy for private location ${privateLocation.label}`
            );
          }

          if (hasPolicy) {
            await this.updatePolicy(newPolicy, currId, savedObjectsClient);
          } else {
            await this.createPolicy(newPolicy, currId, savedObjectsClient);
          }
        } else if (hasPolicy) {
          const soClient = savedObjectsClient;
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

  async createPolicyBulk(
    newPolicies: NewPackagePolicyWithId[],
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const soClient = savedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (soClient && esClient) {
      return await this.server.fleet.packagePolicyService.bulkCreate(
        soClient,
        esClient,
        newPolicies
      );
    }
  }

  async createPolicy(
    newPolicy: NewPackagePolicy,
    id: string,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const soClient = savedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;
    if (soClient && esClient) {
      return await this.server.fleet.packagePolicyService.create(soClient, esClient, newPolicy, {
        id,
        overwrite: true,
        packageInfo: this.syntheticsPkgInfo,
      });
    }
  }

  async updatePolicy(
    updatedPolicy: NewPackagePolicy,
    id: string,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const soClient = savedObjectsClient;
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

  async getMonitor(id: string, savedObjectsClient: SavedObjectsClientContract) {
    try {
      const soClient = savedObjectsClient;
      return await this.server.fleet.packagePolicyService.get(soClient!, id);
    } catch (e) {
      this.server.logger.debug(e);
      return null;
    }
  }

  async deleteMonitorBulk(
    configs: HeartbeatConfig[],
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const soClient = savedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;

    if (soClient && esClient) {
      const policyIdsToDelete = [];
      for (const config of configs) {
        const { locations } = config;

        const allPrivateLocations: PrivateLocation[] =
          this.privateLocations ?? (await getSyntheticsPrivateLocations(soClient));

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
              policyIdsToDelete.push(this.getPolicyId(config, location, request));
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
      await this.server.fleet.packagePolicyService.delete(soClient, esClient, policyIdsToDelete, {
        force: true,
      });
    }
  }

  async deleteMonitor(
    config: HeartbeatConfig,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const soClient = savedObjectsClient;
    const esClient = this.server.uptimeEsClient.baseESClient;

    if (soClient && esClient) {
      const { locations } = config;

      const allPrivateLocations: PrivateLocation[] =
        this.privateLocations ?? (await getSyntheticsPrivateLocations(soClient));

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
              [this.getPolicyId(config, location, request)],
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
