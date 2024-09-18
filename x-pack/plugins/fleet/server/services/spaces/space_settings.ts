/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { SPACE_SETTINGS_ID_SUFFIX } from '../../../common/constants';
import { appContextService } from '../app_context';
import { SPACE_SETTINGS_SAVED_OBJECT_TYPE } from '../../constants';
import type { SpaceSettingsSOAttributes } from '../../types';
import { FleetUnauthorizedError } from '../..';

function _getSavedObjectId(spaceId?: string) {
  if (!spaceId || spaceId === DEFAULT_SPACE_ID) {
    return `${DEFAULT_SPACE_ID}${SPACE_SETTINGS_ID_SUFFIX}`;
  }

  return `${spaceId}${SPACE_SETTINGS_ID_SUFFIX}`;
}

export async function getSpaceSettings(spaceId?: string) {
  const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);

  const settings = await soClient
    .get<SpaceSettingsSOAttributes>(SPACE_SETTINGS_SAVED_OBJECT_TYPE, _getSavedObjectId(spaceId))
    .catch((err) => {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    });

  return {
    allowed_namespace_prefixes: settings?.attributes?.allowed_namespace_prefixes ?? [],
    managed_by: settings?.attributes?.managed_by,
  };
}

export async function saveSpaceSettings({
  settings,
  spaceId,
  managedBy,
}: {
  settings: Partial<SpaceSettingsSOAttributes>;
  spaceId?: string;
  managedBy?: 'kibana_config';
}) {
  const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);

  const originalSettings = await getSpaceSettings(spaceId);
  if (originalSettings.managed_by && originalSettings.managed_by !== managedBy) {
    throw new FleetUnauthorizedError(
      `Settings are managed by: ${originalSettings.managed_by} and should be edited there`
    );
  }

  await soClient.update<SpaceSettingsSOAttributes>(
    SPACE_SETTINGS_SAVED_OBJECT_TYPE,
    _getSavedObjectId(spaceId),
    settings,
    {
      upsert: settings,
    }
  );
}
