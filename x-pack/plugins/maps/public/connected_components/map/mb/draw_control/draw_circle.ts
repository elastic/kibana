/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

// @ts-expect-error
import turfDistance from '@turf/distance';
// @ts-expect-error
import turfCircle from '@turf/circle';

type DrawCircleState = {
  circle: {
    properties: {
      center: {} | null;
      radiusKm: number;
    };
    id: string | number;
    incomingCoords: (coords: unknown[]) => void;
    toGeoJSON: () => unknown;
  };
};

type MouseEvent = {
  lngLat: {
    lng: number;
    lat: number;
  };
};

export const DrawCircle = {
  onSetup() {
    // @ts-ignore
    const circle: unknown = this.newFeature({
      type: 'Feature',
      properties: {
        center: null,
        radiusKm: 0,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[]],
      },
    });

    // @ts-ignore
    this.addFeature(circle);
    // @ts-ignore
    this.clearSelectedFeatures();
    // @ts-ignore
    this.updateUIClasses({ mouse: 'add' });
    // @ts-ignore
    this.setActionableState({
      trash: true,
    });
    return {
      circle,
    };
  },
  onKeyUp(state: DrawCircleState, e: { keyCode: number }) {
    if (e.keyCode === 27) {
      // clear point when user hits escape
      state.circle.properties.center = null;
      state.circle.properties.radiusKm = 0;
      state.circle.incomingCoords([[]]);
    }
  },
  onClick(state: DrawCircleState, e: MouseEvent) {
    if (!state.circle.properties.center) {
      // first click, start circle
      state.circle.properties.center = [e.lngLat.lng, e.lngLat.lat];
    } else {
      // second click, finish draw
      // @ts-ignore
      this.updateUIClasses({ mouse: 'pointer' });
      state.circle.properties.radiusKm = turfDistance(state.circle.properties.center, [
        e.lngLat.lng,
        e.lngLat.lat,
      ]);
      // @ts-ignore
      this.changeMode('simple_select', { featuresId: state.circle.id });
    }
  },
  onMouseMove(state: DrawCircleState, e: MouseEvent) {
    if (!state.circle.properties.center) {
      // circle not started, nothing to update
      return;
    }

    const mouseLocation = [e.lngLat.lng, e.lngLat.lat];
    state.circle.properties.radiusKm = turfDistance(state.circle.properties.center, mouseLocation);
    const newCircleFeature = turfCircle(
      state.circle.properties.center,
      state.circle.properties.radiusKm
    );
    state.circle.incomingCoords(newCircleFeature.geometry.coordinates);
  },
  onStop(state: DrawCircleState) {
    // @ts-ignore
    this.updateUIClasses({ mouse: 'none' });
    // @ts-ignore
    this.activateUIButton();

    // @ts-ignore
    if (this.getFeature(state.circle.id) === undefined) return;

    if (state.circle.properties.center && state.circle.properties.radiusKm > 0) {
      // @ts-ignore
      this.map.fire('draw.create', {
        features: [state.circle.toGeoJSON()],
      });
    } else {
      // @ts-ignore
      this.deleteFeature([state.circle.id], { silent: true });
      // @ts-ignore
      this.changeMode('simple_select', {}, { silent: true });
    }
  },
  toDisplayFeatures(
    state: DrawCircleState,
    geojson: { properties: { active: string } },
    display: (geojson: unknown) => unknown
  ) {
    if (state.circle.properties.center) {
      geojson.properties.active = 'true';
      return display(geojson);
    }
  },
  onTrash(state: DrawCircleState) {
    // @ts-ignore
    this.deleteFeature([state.circle.id], { silent: true });
    // @ts-ignore
    this.changeMode('simple_select');
  },
};
