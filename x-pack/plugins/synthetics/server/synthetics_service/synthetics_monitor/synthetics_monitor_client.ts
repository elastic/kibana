/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { SyntheticsPrivateLocation } from '../private_location/synthetics_private_location';
import { SyntheticsService } from '../synthetics_service';
import { formatHeartbeatRequest } from '../formatters/format_configs';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitorWithId,
  EncryptedSyntheticsMonitorWithId,
  HeartbeatConfig,
  PrivateLocation,
  EncryptedSyntheticsMonitor,
} from '../../../common/runtime_types';

export class SyntheticsMonitorClient {
  public syntheticsService: SyntheticsService;

  public privateLocationAPI: SyntheticsPrivateLocation;

  constructor(syntheticsService: SyntheticsService, server: UptimeServerSetup) {
    this.syntheticsService = syntheticsService;
    this.privateLocationAPI = new SyntheticsPrivateLocation(server);
  }

  async addMonitors(
    monitors: Array<{ monitor: MonitorFields; id: string }>,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract,
    allPrivateLocations: PrivateLocation[],
    spaceId: string
  ) {
    const privateConfigs: HeartbeatConfig[] = [];
    const publicConfigs: HeartbeatConfig[] = [];

    for (const monitorObj of monitors) {
      const { monitor, id } = monitorObj;
      const config = formatHeartbeatRequest({
        monitor,
        monitorId: id,
        heartbeatId: monitor[ConfigKey.MONITOR_QUERY_ID],
      });

      const { privateLocations, publicLocations } = this.parseLocations(config);
      if (privateLocations.length > 0) {
        privateConfigs.push(config);
      }

      if (publicLocations.length > 0) {
        publicConfigs.push(config);
      }
    }

    let newPolicies;

    if (privateConfigs.length > 0) {
      newPolicies = await this.privateLocationAPI.createMonitors(
        privateConfigs,
        request,
        savedObjectsClient,
        allPrivateLocations,
        spaceId
      );
    }

    let syncErrors;

    if (publicConfigs.length > 0) {
      syncErrors = await this.syntheticsService.addConfig(publicConfigs);
    }

    return { newPolicies, syncErrors };
  }

  async editMonitors(
    monitors: Array<{
      monitor: MonitorFields;
      id: string;
      previousMonitor?: SavedObject<EncryptedSyntheticsMonitor>;
    }>,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract,
    allPrivateLocations: PrivateLocation[],
    spaceId: string
  ) {
    const privateConfigs: HeartbeatConfig[] = [];
    const publicConfigs: HeartbeatConfig[] = [];

    for (const editedMonitor of monitors) {
      const editedConfig = formatHeartbeatRequest({
        monitor: editedMonitor.monitor,
        monitorId: editedMonitor.id,
        heartbeatId: (editedMonitor.monitor as MonitorFields)[ConfigKey.MONITOR_QUERY_ID],
      });
      const { publicLocations, privateLocations } = this.parseLocations(editedConfig);
      if (publicLocations.length > 0) {
        publicConfigs.push(editedConfig);
      }

      if (privateLocations.length > 0 || this.hasPrivateLocations(editedMonitor.previousMonitor)) {
        privateConfigs.push(editedConfig);
      }
    }

    await this.privateLocationAPI.editMonitors(
      privateConfigs,
      request,
      savedObjectsClient,
      allPrivateLocations,
      spaceId
    );

    if (publicConfigs.length > 0) {
      return await this.syntheticsService.editConfig(publicConfigs);
    }
  }
  async deleteMonitors(
    monitors: Array<EncryptedSyntheticsMonitorWithId | SyntheticsMonitorWithId>,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract,
    spaceId: string
  ) {
    /* Type cast encrypted saved objects to decrypted saved objects for delete flow only.
     * Deletion does not require all monitor fields */
    const privateDeletePromise = this.privateLocationAPI.deleteMonitors(
      monitors as SyntheticsMonitorWithId[],
      request,
      savedObjectsClient,
      spaceId
    );

    const publicDeletePromise = this.syntheticsService.deleteConfigs(
      monitors as SyntheticsMonitorWithId[]
    );
    const [pubicResponse] = await Promise.all([publicDeletePromise, privateDeletePromise]);

    return pubicResponse;
  }

  hasPrivateLocations(previousMonitor?: SavedObject<EncryptedSyntheticsMonitor>) {
    if (!previousMonitor) {
      return false;
    }
    const { locations } = previousMonitor.attributes;

    return locations.some((loc) => !loc.isServiceManaged);
  }

  parseLocations(config: HeartbeatConfig) {
    const { locations } = config;

    const privateLocations = locations.filter((loc) => !loc.isServiceManaged);
    const publicLocations = locations.filter((loc) => loc.isServiceManaged);

    return { privateLocations, publicLocations };
  }
}
