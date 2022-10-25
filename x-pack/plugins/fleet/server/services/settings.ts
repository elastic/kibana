/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual } from 'lodash';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { decodeCloudId, normalizeHostsForAgents } from '../../common/services';
import { GLOBAL_SETTINGS_SAVED_OBJECT_TYPE, GLOBAL_SETTINGS_ID } from '../../common/constants';
import type { SettingsSOAttributes, Settings, BaseSettings } from '../../common/types';

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
    preconfigured_fields: getConfigFleetServerHosts() ? ['fleet_server_hosts'] : [],
  };
}

export async function settingsSetup(soClient: SavedObjectsClientContract) {
  try {
    const settings = await getSettings(soClient);
    const defaultSettings = createDefaultSettings();

    const fleetServerHostsIsPreconfigured = getConfigFleetServerHosts()?.length ?? 0 > 0;

    const fleetServerHostsShouldBeUpdated =
      !settings.fleet_server_hosts ||
      settings.fleet_server_hosts.length === 0 ||
      (fleetServerHostsIsPreconfigured &&
        !isEqual(settings.fleet_server_hosts, defaultSettings.fleet_server_hosts));

    // Migration for < 7.13 Kibana
    if (defaultSettings.fleet_server_hosts.length > 0 && fleetServerHostsShouldBeUpdated) {
      return saveSettings(soClient, {
        fleet_server_hosts: defaultSettings.fleet_server_hosts,
      });
    }
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      const defaultSettings = createDefaultSettings();
      return saveSettings(soClient, defaultSettings);
    }

    throw e;
  }
}

export async function saveSettings(
  soClient: SavedObjectsClientContract,
  newData: Partial<Omit<Settings, 'id'>>
): Promise<Partial<Settings> & Pick<Settings, 'id'>> {
  const data = { ...newData };
  if (data.fleet_server_hosts) {
    data.fleet_server_hosts = data.fleet_server_hosts.map(normalizeHostsForAgents);
  }

  try {
    const settings = await getSettings(soClient);

    const res = await soClient.update<SettingsSOAttributes>(
      GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      settings.id,
      data
    );

    return {
      id: settings.id,
      ...res.attributes,
    };
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      const defaultSettings = createDefaultSettings();
      const res = await soClient.create<SettingsSOAttributes>(
        GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        {
          ...defaultSettings,
          ...data,
        },
        {
          id: GLOBAL_SETTINGS_ID,
          overwrite: true,
        }
      );

      return {
        id: res.id,
        ...res.attributes,
      };
    }

    throw e;
  }
}

function getConfigFleetServerHosts() {
  const config = appContextService.getConfig();
  return config?.agents?.fleet_server?.hosts && config.agents.fleet_server.hosts.length > 0
    ? config?.agents?.fleet_server?.hosts
    : undefined;
}

export function createDefaultSettings(): BaseSettings {
  const configFleetServerHosts = getConfigFleetServerHosts();
  const cloudFleetServerHosts = getCloudFleetServersHosts();

  const fleetServerHosts = configFleetServerHosts ?? cloudFleetServerHosts ?? [];

  return {
    fleet_server_hosts: fleetServerHosts,
    prerelease_integrations_enabled: false,
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
    return [
      `https://${cloudSetup.deploymentId}.fleet.${res.host}${
        res.defaultPort !== '443' ? `:${res.defaultPort}` : ''
      }`,
    ];
  }
}
