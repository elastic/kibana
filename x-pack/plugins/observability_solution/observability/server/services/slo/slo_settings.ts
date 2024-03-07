/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SloSettings } from '../../domain/models';
import { sloSettingsObjectId, SO_SLO_SETTINGS_TYPE } from '../../saved_objects/slo_settings';

export const getSloSettings = async (soClient: SavedObjectsClientContract) => {
  try {
    const object = await soClient.get<SloSettings>(SO_SLO_SETTINGS_TYPE, sloSettingsObjectId);
    return object.attributes;
  } catch (e) {
    return {
      useAllRemoteClusters: true,
      selectedRemoteClusters: [],
    };
  }
};

export const getRemoteClustersToUse = async (soClient: SavedObjectsClientContract) => {
  try {
    const object = await soClient.get<SloSettings>(SO_SLO_SETTINGS_TYPE, sloSettingsObjectId);
    return object.attributes;
  } catch (e) {
    return {
      useAllRemoteClusters: true,
      selectedRemoteClusters: [],
    };
  }
};
