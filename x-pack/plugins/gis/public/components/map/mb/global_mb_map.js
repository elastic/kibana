/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mapboxgl from 'mapbox-gl';

let MB_MAP = null;

export function createGlobalMbMapInstance(node) {
  MB_MAP = new mapboxgl.Map({
    container: node,
    style: {
      version: 8,
      sources: {},
      layers: [],
    },
  });
  MB_MAP.dragRotate.disable();
  MB_MAP.touchZoomRotate.disableRotation();
  return MB_MAP;
}

/**
 * this is to provide access to the raw map component in the selector
 */
export function getMbMap() {
  if (MB_MAP && !MB_MAP.isStyleLoaded()) {
    return;
  }
  return MB_MAP;
}
