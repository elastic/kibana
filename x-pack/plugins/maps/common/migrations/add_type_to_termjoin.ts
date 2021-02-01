/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapSavedObjectAttributes } from '../map_saved_object_type';
import { JoinDescriptor, LayerDescriptor } from '../descriptor_types';
import { LAYER_TYPE, SOURCE_TYPES } from '../constants';

// enforce type property on joins. It's possible older saved-objects do not have this correctly filled in
// e.g. sample-data was missing the right.type field.
// This is just to be safe.
export function addTypeToTermJoin({
  attributes,
}: {
  attributes: MapSavedObjectAttributes;
}): MapSavedObjectAttributes {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  const layerList: LayerDescriptor[] = JSON.parse(attributes.layerListJSON);

  layerList.forEach((layer: LayerDescriptor) => {
    if (layer.type !== LAYER_TYPE.VECTOR) {
      return;
    }

    if (!layer.joins) {
      return;
    }
    layer.joins.forEach((join: JoinDescriptor) => {
      if (!join.right) {
        return;
      }

      if (typeof join.right.type === 'undefined') {
        join.right.type = SOURCE_TYPES.ES_TERM_SOURCE;
      }
    });
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
