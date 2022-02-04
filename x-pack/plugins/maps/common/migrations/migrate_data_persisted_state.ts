/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrateFunctionsObject } from '../../../../../src/plugins/kibana_utils/common';
import { MapSavedObjectAttributes } from '../map_saved_object_type';

export function migrateDataPersistedState(
  {
    attributes,
  }: {
    attributes: MapSavedObjectAttributes;
  },
  filterMigrations: MigrateFunctionsObject
): MapSavedObjectAttributes {
  if (!attributes) {
    return attributes;
  }

  return {
    ...attributes,
  };

  /* let layerList: LayerDescriptor[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }*/

  /* this._attributes!.layerListJSON = JSON.stringify(layerListConfigOnly);

    this._attributes!.mapStateJSON = JSON.stringify({
      zoom: getMapZoom(state),
      center: getMapCenter(state),
      timeFilters: getTimeFilters(state),
      refreshConfig: {
        isPaused: getTimeFilter().getRefreshInterval().pause,
        interval: getTimeFilter().getRefreshInterval().value,
      },
      query: getQuery(state),
      filters: getFilters(state),
      settings: getMapSettings(state),
    } as SerializedMapState);*/
}
