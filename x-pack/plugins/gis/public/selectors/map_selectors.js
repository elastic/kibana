/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import _ from 'lodash';

export const getSelectedLayer = ({ map }) => map && map.selectedLayer;

export const getLayerList = ({ map }) => map && map.layerList;

export const getVectorLayerOptions = ({ map }) => map && map.vectorSources;

export function getVectorLayerOptionsByName(state) {
  return createSelector(
    getVectorLayerOptions,
    vectorLayerOptions => {
      return _.isEmpty(vectorLayerOptions) ? []
        : _.groupBy(vectorLayerOptions, ({ name }) => name);
    }
  )(state);
}

