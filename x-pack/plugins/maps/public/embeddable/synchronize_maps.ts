/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapCenterAndZoom, MapExtent } from '../../common/descriptor_types';

const registry: Record<string, (lat: number, lon: number, zoom: number) => void> = {};
let location: MapCenterAndZoom | undefined;

export const synchronizeMaps = {
  getLocation: function() {
    return location;
  },
  setLocation: function (triggeringEmbedableId: string, lat: number, lon: number, zoom: number) {
    location = { lat, lon, zoom };
    Object.keys(registry).forEach(key => {
      if (key !== triggeringEmbedableId) {
        registry[key](lat, lon, zoom);
      }
    });
  },
  register: function (embeddableId: string, handler: (lat: number, lon: number, zoom: number) => void) {
    registry[embeddableId] = handler;
  },
  unregister: function (embeddableId) {
    delete registry[embeddableId];
  },
};