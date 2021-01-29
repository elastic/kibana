/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from '@hapi/boom';
import { SavedObjectsClientContract } from 'kibana/server';
import url from 'url';
import {
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  SettingsSOAttributes,
  Settings,
  decodeCloudId,
  BaseSettings,
} from '../../common';
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
  const http = appContextService.getHttpSetup();
  const serverInfo = http.getServerInfo();
  const basePath = http.basePath;

  const cloud = appContextService.getCloud();
  const cloudId = cloud?.isCloudEnabled && cloud.cloudId;
  const cloudUrl = cloudId && decodeCloudId(cloudId)?.kibanaUrl;
  const flagsUrl = appContextService.getConfig()?.agents?.kibana?.host;
  const defaultUrl = url.format({
    protocol: serverInfo.protocol,
    hostname: serverInfo.hostname,
    port: serverInfo.port,
    pathname: basePath.serverBasePath,
  });

  return {
    agent_auto_upgrade: true,
    package_auto_upgrade: true,
    kibana_urls: [cloudUrl || flagsUrl || defaultUrl].flat(),
  };
}
