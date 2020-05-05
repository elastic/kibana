/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { SavedObjectsClientContract } from 'kibana/server';
import { GLOBAL_SETTINGS_SAVED_OBJECT_TYPE, SettingsSOAttributes, Settings } from '../../common';

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
): Promise<Settings> {
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
      const res = await soClient.create<SettingsSOAttributes>(
        GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        newData
      );

      return {
        id: res.id,
        ...res.attributes,
      };
    }

    throw e;
  }
}
