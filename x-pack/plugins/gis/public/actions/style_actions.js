/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const UPDATE_LAYER_STYLE = 'UPDATE_LAYER_STYLE';
export const PROMOTE_TEMPORARY_STYLES = 'PROMOTE_TEMPORARY_STYLES';
export const CLEAR_TEMPORARY_STYLES = 'CLEAR_TEMPORARY_STYLES';

export function updateLayerStyle(style, temporary = true) {
  return {
    type: UPDATE_LAYER_STYLE,
    style: {
      ...style,
      temporary
    },
  };
}

export function promoteTemporaryStyles() {
  return {
    type: PROMOTE_TEMPORARY_STYLES
  };
}

export function clearTemporaryStyles() {
  return {
    type: CLEAR_TEMPORARY_STYLES
  };
}