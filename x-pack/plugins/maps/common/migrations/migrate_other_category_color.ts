/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { LAYER_STYLE_TYPE, STYLE_TYPE, VECTOR_STYLES } from '../constants';
import {
  ColorStylePropertyDescriptor,
  LayerDescriptor,
  VectorStyleDescriptor,
} from '../descriptor_types';
import { MapSavedObjectAttributes } from '../map_saved_object_type';

const COLOR_STYLES = [
  VECTOR_STYLES.FILL_COLOR,
  VECTOR_STYLES.LINE_COLOR,
  VECTOR_STYLES.LABEL_COLOR,
  VECTOR_STYLES.LABEL_BORDER_COLOR,
];

function migrateColorProperty(
  descriptor: ColorStylePropertyDescriptor
): ColorStylePropertyDescriptor {
  if (descriptor.type === STYLE_TYPE.STATIC) {
    return descriptor;
  }

  if (
    !descriptor.options.customColorPalette ||
    descriptor.options.customColorPalette.length === 0
  ) {
    return descriptor;
  }

  return {
    ...descriptor,
    options: {
      ...descriptor.options,
      otherCategoryColor: descriptor.options.customColorPalette[0].color,
      customColorPalette:
        descriptor.options.customColorPalette.length === 1
          ? []
          : descriptor.options.customColorPalette.slice(1),
    },
  };
}

// In 8.4 explicit "other category color" state added to ColorDynamicOptions
// Prior to 8.4, custom color ramp "other category color" stored in first element of customColorPalette
export function migrateOtherCategoryColor({
  attributes,
}: {
  attributes: MapSavedObjectAttributes;
}): MapSavedObjectAttributes {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  let layerList: LayerDescriptor[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layerDescriptor) => {
    if (layerDescriptor.style?.type !== LAYER_STYLE_TYPE.VECTOR) {
      return;
    }

    Object.keys(_.get(layerDescriptor, 'style.properties', {})).forEach((key) => {
      const styleName = key as VECTOR_STYLES;
      if (!COLOR_STYLES.includes(styleName)) {
        return;
      }

      (layerDescriptor.style as VectorStyleDescriptor)!.properties = {
        ...(layerDescriptor.style as VectorStyleDescriptor)!.properties,
        [styleName]: migrateColorProperty(
          (layerDescriptor.style as VectorStyleDescriptor)!.properties[
            styleName
          ] as unknown as ColorStylePropertyDescriptor
        ),
      };
    });
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
