/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const UPDATE_LAYER_STYLE = 'UPDATE_LAYER_STYLE';

export function updateLayerStyle(style) {
  return {
    type: UPDATE_LAYER_STYLE,
    style
  };
}
