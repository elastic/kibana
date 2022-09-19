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
  PrivateLocation,
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

  async editMonitor(
    editedMonitor: MonitorFields,
    id: string,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract,
    spaceId: string
  ) {
    const editedConfig = formatHeartbeatRequest({
      monitor: editedMonitor,
      monitorId: id,
      customHeartbeatId: (editedMonitor as MonitorFields)[ConfigKey.CUSTOM_HEARTBEAT_ID],
    });

    const { publicLocations } = this.parseLocations(editedConfig);

    await this.privateLocationAPI.editMonitor(editedConfig, request, savedObjectsClient, spaceId);

    if (publicLocations.length > 0) {
      return await this.syntheticsService.editConfig(editedConfig);
    }

    await this.syntheticsService.editConfig(editedConfig);
  }

  async deleteMonitors(
    monitors: SyntheticsMonitorWithId[],
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract,
    spaceId: string
  ) {
    const privateDeletePromise = this.privateLocationAPI.deleteMonitors(
      monitors,
      request,
      savedObjectsClient,
      spaceId
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
