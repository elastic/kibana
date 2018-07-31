/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import _ from 'lodash';

export const getMapConstants = ({ map }) => map && map.mapConstants;

export const getSelectedLayer = ({ map }) => map && map.selectedLayer;

export const getLayerList = ({ map }) => map && map.layerList;

export const getLayerOptions = ({ map }) => map && map.sources;

export const getLayerLoading = ({ map }) => map && map.layerLoading;

export const getTemporaryLayers = ({ map }) => map &&
  map.layerList.filter(({ temporary }) => temporary);

function getLayersById(state) {
  return createSelector(
    getLayerList,
    layerList => layerList.reduce((accu, layer) => ({ ...accu, [layer.id]: layer }), {})
  )(state);
}

export function getLayerById(state, id) {
  return createSelector(
    getLayersById,
    layersByIdList => _.get(layersByIdList, id)
  )(state);
}

function getLayerOptionsByOrigin(state) {
  return createSelector(
    getLayerOptions,
    layerOptions => {
      return _.isEmpty(layerOptions) ? {}
        : _.groupBy(layerOptions, ({ dataOrigin }) => dataOrigin);
    }
  )(state);
}

export function getLayerOptionsByOriginAndType(state) {
  return createSelector(
    getLayerOptionsByOrigin,
    layerOptions => {
      return _.reduce(layerOptions, (accu, services, origin) => {
        accu[origin] = _.groupBy(services, ({ type }) => type);
        return accu;
      }, {});
    }
  )(state);
}
