/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { STYLE_TYPE } from '../constants';

function isVectorLayer(layerDescriptor) {
  const layerType = _.get(layerDescriptor, 'type');
  // can not use LAYER_TYPE because LAYER_TYPE.VECTOR does not exist >8.1
  return layerType === 'VECTOR';
}

export function addFieldMetaOptions({ attributes }) {
  if (!attributes.layerListJSON) {
    return attributes;
  }

  let layerList = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layerDescriptor) => {
    if (isVectorLayer(layerDescriptor) && _.has(layerDescriptor, 'style.properties')) {
      Object.values(layerDescriptor.style.properties).forEach((stylePropertyDescriptor) => {
        if (stylePropertyDescriptor.type === STYLE_TYPE.DYNAMIC) {
          stylePropertyDescriptor.options.fieldMetaOptions = {
            isEnabled: false, // turn off field metadata to avoid changing behavior of existing saved objects
            sigma: 3,
          };
        }
      });
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
