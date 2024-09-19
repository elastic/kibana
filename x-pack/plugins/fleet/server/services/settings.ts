/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsClientContract, SavedObjectsUpdateOptions } from '@kbn/core/server';

import { normalizeHostsForAgents } from '../../common/services';
import { GLOBAL_SETTINGS_SAVED_OBJECT_TYPE, GLOBAL_SETTINGS_ID } from '../../common/constants';
import type { Settings, BaseSettings } from '../../common/types';
import type { SettingsSOAttributes } from '../types';

import { appContextService } from './app_context';
import { listFleetServerHosts } from './fleet_server_host';
import { auditLoggingService } from './audit_logging';

export async function getSettings(soClient: SavedObjectsClientContract): Promise<Settings> {
  const res = await soClient.find<SettingsSOAttributes>({
    type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  });
  auditLoggingService.writeCustomSoAuditLog({
    action: 'get',
    id: GLOBAL_SETTINGS_ID,
    savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  });

  if (res.total === 0) {
    throw Boom.notFound('Global settings not found');
  }
  const settingsSo = res.saved_objects[0];
  const fleetServerHosts = await listFleetServerHosts(soClient);

  return {
    id: settingsSo.id,
    version: settingsSo.version,
    secret_storage_requirements_met: settingsSo.attributes.secret_storage_requirements_met,
    output_secret_storage_requirements_met:
      settingsSo.attributes.output_secret_storage_requirements_met,
    has_seen_add_data_notice: settingsSo.attributes.has_seen_add_data_notice,
    prerelease_integrations_enabled: settingsSo.attributes.prerelease_integrations_enabled,
    use_space_awareness_migration_status:
      settingsSo.attributes.use_space_awareness_migration_status,
    use_space_awareness_migration_started_at:
      settingsSo.attributes.use_space_awareness_migration_started_at,
    fleet_server_hosts: fleetServerHosts.items.flatMap((item) => item.host_urls),
    preconfigured_fields: getConfigFleetServerHosts() ? ['fleet_server_hosts'] : [],
  };
}

export async function getSettingsOrUndefined(
  soClient: SavedObjectsClientContract
): Promise<Settings | undefined> {
  try {
    return await getSettings(soClient);
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      return undefined;
    }

    throw e;
  }
}

export async function settingsSetup(soClient: SavedObjectsClientContract) {
  try {
    await getSettings(soClient);
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
  newData: Partial<Omit<Settings, 'id'>>,
  options?: SavedObjectsUpdateOptions<SettingsSOAttributes> & { createWithOverwrite?: boolean }
): Promise<Partial<Settings> & Pick<Settings, 'id'>> {
  const data = { ...newData };
  if (data.fleet_server_hosts) {
    data.fleet_server_hosts = data.fleet_server_hosts.map(normalizeHostsForAgents);
  }
  const { createWithOverwrite, ...updateOptions } = options ?? {};

  try {
    const settings = await getSettings(soClient);

    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id: settings.id,
      savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
    });

    const res = await soClient.update<SettingsSOAttributes>(
      GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      settings.id,
      data,
      updateOptions
    );

    return {
      id: settings.id,
      ...res.attributes,
    };
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      const defaultSettings = createDefaultSettings();

      auditLoggingService.writeCustomSoAuditLog({
        action: 'create',
        id: GLOBAL_SETTINGS_ID,
        savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      });

      const res = await soClient.create<SettingsSOAttributes>(
        GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        {
          ...defaultSettings,
          ...data,
        },
        {
          id: GLOBAL_SETTINGS_ID,
          // Do not overwrite if version is passed
          overwrite: typeof createWithOverwrite === 'undefined' ? true : createWithOverwrite,
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
  return { prerelease_integrations_enabled: false };
}
