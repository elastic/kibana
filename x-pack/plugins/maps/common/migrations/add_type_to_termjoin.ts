/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapSavedObjectAttributes } from '../map_saved_object_type';
import { LayerDescriptor } from '../descriptor_types';

export function addTypeToTermJoin({
  attributes,
}: {
  attributes: MapSavedObjectAttributes;
}): MapSavedObjectAttributes {
  if (!attributes || !attributes.mapStateJSON) {
    return attributes;
  }

  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  const layerList: LayerDescriptor[] = JSON.parse(attributes.layerListJSON);

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
