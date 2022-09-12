/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { SyntheticsPrivateLocation } from '../private_location/synthetics_private_location';
import { SyntheticsService } from '../synthetics_service';
import { formatHeartbeatRequest } from '../formatters/format_configs';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitorWithId,
  HeartbeatConfig,
} from '../../../common/runtime_types';

export class SyntheticsMonitorClient {
  public syntheticsService: SyntheticsService;

  public privateLocationAPI: SyntheticsPrivateLocation;

  constructor(syntheticsService: SyntheticsService, server: UptimeServerSetup) {
    this.syntheticsService = syntheticsService;
    this.privateLocationAPI = new SyntheticsPrivateLocation(server);
  }

  async addMonitor(
    monitor: MonitorFields,
    id: string,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    await this.syntheticsService.setupIndexTemplates();

    const config = formatHeartbeatRequest({
      monitor,
      monitorId: id,
      customHeartbeatId: monitor[ConfigKey.CUSTOM_HEARTBEAT_ID],
    });

    const { privateLocations, publicLocations } = this.parseLocations(config);

    if (privateLocations.length > 0) {
      await this.privateLocationAPI.createMonitor(config, request, savedObjectsClient);
    }

    if (publicLocations.length > 0) {
      return await this.syntheticsService.addConfig(config);
    }
  }

  async addMonitorBulk(
    monitors: Array<{ monitor: MonitorFields; id: string }>,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const privateConfigs: HeartbeatConfig[] = [];
    const publicConfigs: HeartbeatConfig[] = [];

    for (const monitorObj of monitors) {
      const { monitor, id } = monitorObj;
      const config = formatHeartbeatRequest({
        monitor,
        monitorId: id,
        customHeartbeatId: monitor[ConfigKey.CUSTOM_HEARTBEAT_ID],
      });

      const { privateLocations, publicLocations } = this.parseLocations(config);
      if (privateLocations.length > 0) {
        privateConfigs.push(config);
      }

      if (publicLocations.length > 0) {
        publicConfigs.push(config);
      }
    }

    if (privateConfigs.length > 0) {
      await this.privateLocationAPI.createMonitorBulk(privateConfigs, request, savedObjectsClient);
    }

    if (publicConfigs.length > 0) {
      return await this.syntheticsService.addConfig(publicConfigs);
    }
  }

  async editMonitor(
    editedMonitor: MonitorFields,
    id: string,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const editedConfig = formatHeartbeatRequest({
      monitor: editedMonitor,
      monitorId: id,
      customHeartbeatId: (editedMonitor as MonitorFields)[ConfigKey.CUSTOM_HEARTBEAT_ID],
    });

    const { publicLocations } = this.parseLocations(editedConfig);

    await this.privateLocationAPI.editMonitor(editedConfig, request, savedObjectsClient);

    if (publicLocations.length > 0) {
      return await this.syntheticsService.editConfig(editedConfig);
    }

    await this.syntheticsService.editConfig(editedConfig);
  }

  async deleteMonitor(
    monitor: SyntheticsMonitorWithId,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    await this.privateLocationAPI.deleteMonitor(monitor, request, savedObjectsClient);
    return await this.syntheticsService.deleteConfigs([monitor]);
  }

  async deleteMonitorBulk(
    monitors: SyntheticsMonitorWithId[],
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const privateDeletePromise = this.privateLocationAPI.deleteMonitorBulk(
      monitors,
      request,
      savedObjectsClient
    );

    const publicDeletePromise = this.syntheticsService.deleteConfigs(monitors);
    const [pubicResponse] = await Promise.all([publicDeletePromise, privateDeletePromise]);

    return pubicResponse;
  }

  parseLocations(config: HeartbeatConfig) {
    const { locations } = config;

    const privateLocations = locations.filter((loc) => !loc.isServiceManaged);
    const publicLocations = locations.filter((loc) => loc.isServiceManaged);

    return { privateLocations, publicLocations };
  }
}
