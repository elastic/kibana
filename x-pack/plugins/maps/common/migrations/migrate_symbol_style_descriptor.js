/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { DEFAULT_ICON, LAYER_TYPE, STYLE_TYPE, SYMBOLIZE_AS_TYPES } from '../constants';

function isVectorLayer(layerDescriptor) {
  const layerType = _.get(layerDescriptor, 'type');
  return layerType === LAYER_TYPE.VECTOR;
}

export function migrateSymbolStyleDescriptor({ attributes }) {
  if (!attributes.layerListJSON) {
    return attributes;
  }

  const layerList = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layerDescriptor) => {
    if (!isVectorLayer(layerDescriptor) || !_.has(layerDescriptor, 'style.properties')) {
      return;
    }

    const symbolizeAs = _.get(
      layerDescriptor,
      'style.properties.symbol.options.symbolizeAs',
      SYMBOLIZE_AS_TYPES.CIRCLE
    );
    layerDescriptor.style.properties.symbolizeAs = {
      options: { value: symbolizeAs },
    };
    const iconId = _.get(layerDescriptor, 'style.properties.symbol.options.symbolId', DEFAULT_ICON);
    layerDescriptor.style.properties.icon = {
      type: STYLE_TYPE.STATIC,
      options: { value: iconId },
    };
    delete layerDescriptor.style.properties.symbol;
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
