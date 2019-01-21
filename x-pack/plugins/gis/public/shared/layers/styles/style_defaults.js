/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const DEFAULT_ALPHA_VALUE = 0.75;
const DEFAULT_TILE_ALPHA_VALUE = 1;

export function getDefaultStyleProperties(isTileLayer = false) {
  return {
    alphaValue: isTileLayer ? DEFAULT_TILE_ALPHA_VALUE : DEFAULT_ALPHA_VALUE
  };
}
