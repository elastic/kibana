/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { createSelector } from 'reselect';

export const getSelectedLayer = ({ map }) => map && map.selectedLayer;

export const getLayerList = ({ map }) => map && map.layerList;

export function getLayersBySource(state) {
  return createSelector(
    getLayerList,
    layers => _.groupBy(layers, ({ appData }) => appData.source)
  )(state);
}

export function getLayersByType(state) {
  return createSelector(
    getLayerList,
    layers => _.groupBy(layers, ({ appData }) => appData.layerType)
  )(state);
}
