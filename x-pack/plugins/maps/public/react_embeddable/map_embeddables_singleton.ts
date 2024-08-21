/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { MapCenterAndZoom } from '../../common/descriptor_types';

interface MapPanel {
  getTitle(): string;
  onLocationChange(lat: number, lon: number, zoom: number): void;
  getIsMovementSynchronized(): boolean;
  setIsMovementSynchronized(IsMovementSynchronized: boolean): void;
  getIsFilterByMapExtent(): boolean;
  setIsFilterByMapExtent(isFilterByMapExtent: boolean): void;
  getGeoFieldNames(): string[];
}

const registry: Record<string, MapPanel> = {};
let location: MapCenterAndZoom | undefined;
let primaryPanelId: string | undefined;
let primaryPanelTimeoutId: ReturnType<typeof setTimeout> | undefined;

export const mapEmbeddablesSingleton = {
  getGeoFieldNames() {
    const geoFieldNames: string[] = [];
    Object.values(registry).forEach((mapPanel) => {
      geoFieldNames.push(...mapPanel.getGeoFieldNames());
    });
    return _.uniq(geoFieldNames);
  },
  getLocation() {
    return location;
  },
  getMapPanels() {
    return Object.keys(registry).map((key) => {
      return {
        ...registry[key],
        id: key,
      };
    });
  },
  hasMultipleMaps() {
    return Object.keys(registry).length > 1;
  },
  register(embeddableId: string, mapPanel: MapPanel) {
    registry[embeddableId] = mapPanel;
  },
  setLocation(triggeringEmbeddableId: string, lat: number, lon: number, zoom: number) {
    if (primaryPanelId && primaryPanelId !== triggeringEmbeddableId) {
      // to avoid callstack overflow and bouncing between locations,
      // do not propagate location changes from "follower" panels
      return;
    }

    primaryPanelId = triggeringEmbeddableId;
    if (primaryPanelTimeoutId) {
      clearTimeout(primaryPanelTimeoutId);
    }
    primaryPanelTimeoutId = setTimeout(() => {
      // release "primary" panel lock on timeout allowing movement in other panels to all them to become "primary"
      primaryPanelId = undefined;
    }, 500);

    location = { lat, lon, zoom };
    Object.keys(registry).forEach((key) => {
      if (key === triggeringEmbeddableId) {
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
    if (Object.keys(registry).length === 0) {
      // clear location to not pollute location between embeddable containers
      location = undefined;
    }
  },
};
