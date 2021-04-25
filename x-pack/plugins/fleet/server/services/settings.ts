/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsClientContract } from 'kibana/server';

import { decodeCloudId, GLOBAL_SETTINGS_SAVED_OBJECT_TYPE } from '../../common';
import type { SettingsSOAttributes, Settings, BaseSettings } from '../../common';

import { appContextService } from './app_context';

export async function getSettings(soClient: SavedObjectsClientContract): Promise<Settings> {
  const res = await soClient.find<SettingsSOAttributes>({
    type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  });

  if (res.total === 0) {
    throw Boom.notFound('Global settings not found');
  }
  const settingsSo = res.saved_objects[0];
  return {
    id: settingsSo.id,
    ...settingsSo.attributes,
    fleet_server_hosts: settingsSo.attributes.fleet_server_hosts || [],
  };
}

export async function saveSettings(
  soClient: SavedObjectsClientContract,
  newData: Partial<Omit<Settings, 'id'>>
): Promise<Partial<Settings> & Pick<Settings, 'id'>> {
  try {
    const settings = await getSettings(soClient);

    const res = await soClient.update<SettingsSOAttributes>(
      GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      settings.id,
      newData
    );

    return {
      id: settings.id,
      ...res.attributes,
    };
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      const defaultSettings = createDefaultSettings();
      const res = await soClient.create<SettingsSOAttributes>(GLOBAL_SETTINGS_SAVED_OBJECT_TYPE, {
        ...defaultSettings,
        ...newData,
      });

      return {
        id: res.id,
        ...res.attributes,
      };
    }

    throw e;
  }
}

export function createDefaultSettings(): BaseSettings {
  const configFleetServerHosts = appContextService.getConfig()?.agents?.fleet_server?.hosts;
  const cloudFleetServerHosts = getCloudFleetServersHosts();

  const fleetServerHosts = configFleetServerHosts ?? cloudFleetServerHosts ?? [];

  return {
    fleet_server_hosts: fleetServerHosts,
  };
}

export function getCloudFleetServersHosts() {
  const cloudSetup = appContextService.getCloud();
  if (cloudSetup && cloudSetup.isCloudEnabled && cloudSetup.cloudId && cloudSetup.deploymentId) {
    const res = decodeCloudId(cloudSetup.cloudId);
    if (!res) {
      return;
    }

    // Fleet Server url are formed like this `https://<deploymentId>.fleet.<host>
    return [`https://${cloudSetup.deploymentId}.fleet.${res.host}`];
  }
}
