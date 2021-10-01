/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapSavedObjectAttributes } from '../map_saved_object_type';
import { LayerDescriptor } from '../descriptor_types';

// In 7.14, attribution added to the layer_descriptor. Prior to 7.14, 2 sources, WMS and TMS, had attribution on source descriptor.
export function moveAttribution({
  attributes,
}: {
  attributes: MapSavedObjectAttributes;
}): MapSavedObjectAttributes {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  const layerList: LayerDescriptor[] = JSON.parse(attributes.layerListJSON);

  layerList.forEach((layer: LayerDescriptor) => {
    const sourceDescriptor = layer.sourceDescriptor as {
      attributionText?: string;
      attributionUrl?: string;
    };
    if (sourceDescriptor.attributionText && sourceDescriptor.attributionUrl) {
      layer.attribution = {
        label: sourceDescriptor.attributionText,
        url: sourceDescriptor.attributionUrl,
      };
      delete sourceDescriptor.attributionText;
      delete sourceDescriptor.attributionUrl;
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
