/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapCenterAndZoom } from '../../common/descriptor_types';

interface MapPanel {
  getTitle(): string;
  onLocationChange(lat: number, lon: number, zoom: number): void;
  getIsMovementSynchronized(): boolean;
  setIsMovementSynchronized(IsMovementSynchronized: boolean): void;
}

const registry: Record<string, MapPanel> = {};
let location: MapCenterAndZoom | undefined;

export const synchronizeMovement = {
  getLocation() {
    return location;
  },
  getMapPanels() {
    return Object.keys(registry).map(key => {
      return {
        ...registry[key],
        id: key,
      }
    });
  },
  hasMultipleMaps() {
    return Object.keys(registry).length > 1;
  },
  register(embeddableId: string, mapPanel: MapPanel) {
    registry[embeddableId] = mapPanel;
  },
  setLocation(triggeringEmbedableId: string, lat: number, lon: number, zoom: number) {
    if (location && location.lat === lat && location.lon === lon && location.zoom === zoom) {
      return;
    }

    location = { lat, lon, zoom };
    Object.keys(registry).forEach((key) => {
      if (key === triggeringEmbedableId) {
        return;
      }
      const mapPanel = registry[key];
      if (mapPanel.getIsMovementSynchronized()) {
        mapPanel.onLocationChange(lat, lon, zoom);
      }
    });
  },
  unregister(embeddableId: string) {
    delete registry[embeddableId];
  },
};
