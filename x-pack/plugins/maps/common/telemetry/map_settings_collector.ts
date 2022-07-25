/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapSavedObjectAttributes } from '../map_saved_object_type';
import { MapSettings } from '../descriptor_types';

export class MapSettingsCollector {
  private _customIconsCount: number = 0;

  constructor(attributes: MapSavedObjectAttributes) {
    if (!attributes || !attributes.mapStateJSON) {
      return;
    }

    let mapSettings: MapSettings;

    try {
      const mapState = JSON.parse(attributes.mapStateJSON);
      mapSettings = mapState.settings;
    } catch (e) {
      return;
    }

    if (!mapSettings) {
      return;
    }

    if (mapSettings.customIcons) {
      this._customIconsCount = mapSettings.customIcons.length;
    }
  }

  getCustomIconsCount() {
    return this._customIconsCount;
  }
}
