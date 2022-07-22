/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { SyntheticsPrivateLocation } from '../private_location/synthetics_private_location';
import { SyntheticsService } from '../synthetics_service';
import { formatHeartbeatRequest, SyntheticsConfig } from '../formatters/format_configs';
import { ConfigKey, MonitorFields, SyntheticsMonitorWithId } from '../../../common/runtime_types';

export class SyntheticsMonitorClient {
  public syntheticsService: SyntheticsService;

  public privateLocationAPI: SyntheticsPrivateLocation;

  constructor(syntheticsService: SyntheticsService, server: UptimeServerSetup) {
    this.syntheticsService = syntheticsService;
    this.privateLocationAPI = new SyntheticsPrivateLocation(server);
  }

  async addMonitor(monitor: MonitorFields, id: string) {
    await this.syntheticsService.setupIndexTemplates();

    const config = formatHeartbeatRequest({
      monitor,
      monitorId: id,
      customHeartbeatId: monitor[ConfigKey.CUSTOM_HEARTBEAT_ID],
    });

    const { privateLocations, publicLocations } = this.parseLocations(config);

    if (privateLocations.length > 0) {
      await this.privateLocationAPI.createMonitor(config);
    }

    if (publicLocations.length > 0) {
      return await this.syntheticsService.addConfig(config);
    }
  }
  async editMonitor(editedMonitor: MonitorFields, id: string) {
    const editedConfig = formatHeartbeatRequest({
      monitor: editedMonitor,
      monitorId: id,
      customHeartbeatId: (editedMonitor as MonitorFields)[ConfigKey.CUSTOM_HEARTBEAT_ID],
    });

    const { privateLocations, publicLocations } = this.parseLocations(editedConfig);

    if (privateLocations.length > 0) {
      await this.privateLocationAPI.editMonitor(editedConfig);
    }

    if (publicLocations.length > 0) {
      return await this.syntheticsService.editConfig(editedConfig);
    }

    await this.syntheticsService.editConfig(editedConfig);
  }
  async deleteMonitor(monitor: SyntheticsMonitorWithId) {
    await this.privateLocationAPI.deleteMonitor(monitor);
    return await this.syntheticsService.deleteConfigs([monitor]);
  }

  parseLocations(config: SyntheticsConfig) {
    const { locations } = config;

    const privateLocations = locations.filter((loc) => !loc.isServiceManaged);
    const publicLocations = locations.filter((loc) => loc.isServiceManaged);

    return { privateLocations, publicLocations };
  }
}
