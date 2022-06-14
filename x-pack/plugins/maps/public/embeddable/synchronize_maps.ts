/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapCenterAndZoom } from '../../common/descriptor_types';

const registry: Record<string, (lat: number, lon: number, zoom: number) => void> = {};
let location: MapCenterAndZoom | undefined;

export const synchronizeMaps = {
  hasMultipleMaps() {
    return Object.keys(registry).length > 1;
  },
  getLocation() {
    return location;
  },
  setLocation(triggeringEmbedableId: string, lat: number, lon: number, zoom: number) {
    if (location && location.lat === lat && location.lon === lon && location.zoom === zoom) {
      return;
    }

    location = { lat, lon, zoom };
    Object.keys(registry).forEach((key) => {
      if (key !== triggeringEmbedableId) {
        registry[key](lat, lon, zoom);
      }
    });
  },
  register(embeddableId: string, handler: (lat: number, lon: number, zoom: number) => void) {
    registry[embeddableId] = handler;
  },
  unregister(embeddableId: string) {
    delete registry[embeddableId];
  },
};
