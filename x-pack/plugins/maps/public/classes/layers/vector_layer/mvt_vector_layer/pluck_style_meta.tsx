/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_ORIGIN, VECTOR_SHAPE_TYPE } from '../../../../../common/constants';
import {
  Category,
  DynamicStylePropertyOptions,
  RangeFieldMeta,
  StyleMetaDescriptor,
  TileMetaFeature,
} from '../../../../../common/descriptor_types';
import { PropertiesMap } from '../../../../../common/elasticsearch_util';
import { IDynamicStyleProperty } from '../../../styles/vector/properties/dynamic_style_property';

export async function pluckStyleMeta(
  metaFeatures: TileMetaFeature[],
  joinPropertiesMap: PropertiesMap | undefined,
  supportedShapeTypes: VECTOR_SHAPE_TYPE[],
  dynamicProperties: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>
): Promise<StyleMetaDescriptor> {
  const styleMeta: StyleMetaDescriptor = {
    geometryTypes: {
      isPointsOnly:
        supportedShapeTypes.length === 1 && supportedShapeTypes.includes(VECTOR_SHAPE_TYPE.POINT),
      isLinesOnly:
        supportedShapeTypes.length === 1 && supportedShapeTypes.includes(VECTOR_SHAPE_TYPE.LINE),
      isPolygonsOnly:
        supportedShapeTypes.length === 1 && supportedShapeTypes.includes(VECTOR_SHAPE_TYPE.POLYGON),
    },
    fieldMeta: {},
  };

  if (dynamicProperties.length === 0 || !metaFeatures) {
    // no additional meta data to pull from source data request.
    return styleMeta;
  }

  dynamicProperties.forEach((dynamicProperty) => {
    const name = dynamicProperty.getFieldName();
    if (!styleMeta.fieldMeta[name]) {
      styleMeta.fieldMeta[name] = { categories: [] };
    }

    const categories = pluckCategoricalStyleMeta(dynamicProperty, metaFeatures, joinPropertiesMap);
    if (categories.length) {
      styleMeta.fieldMeta[name].categories = categories;
    }
    const ordinalStyleMeta = pluckOrdinalStyleMeta(
      dynamicProperty,
      metaFeatures,
      joinPropertiesMap
    );
    if (ordinalStyleMeta) {
      styleMeta.fieldMeta[name].range = ordinalStyleMeta;
    }
  });

  return styleMeta;
}

function pluckCategoricalStyleMeta(
  property: IDynamicStyleProperty<DynamicStylePropertyOptions>,
  metaFeatures: TileMetaFeature[],
  joinPropertiesMap: PropertiesMap | undefined
): Category[] {
  return [];
}

function pluckOrdinalStyleMeta(
  property: IDynamicStyleProperty<DynamicStylePropertyOptions>,
  metaFeatures: TileMetaFeature[],
  joinPropertiesMap: PropertiesMap | undefined
): RangeFieldMeta | null {
  const field = property.getField();
  if (!field || !property.isOrdinal()) {
    return null;
  }

  let min = Infinity;
  let max = -Infinity;
  if (property.getFieldOrigin() === FIELD_ORIGIN.SOURCE) {
    for (let i = 0; i < metaFeatures.length; i++) {
      const range = field.pluckRangeFromTileMetaFeature(metaFeatures[i]);
      if (range) {
        min = Math.min(range.min, min);
        max = Math.max(range.max, max);
      }
    }
  } else if (property.getFieldOrigin() === FIELD_ORIGIN.JOIN && joinPropertiesMap) {
    joinPropertiesMap.forEach((value: { [key: string]: unknown }) => {
      const propertyValue = value[field.getName()];
      if (typeof propertyValue === 'number') {
        min = Math.min(propertyValue as number, min);
        max = Math.max(propertyValue as number, max);
      }
    });
  }

  return min === Infinity || max === -Infinity
    ? null
    : {
        min,
        max,
        delta: max - min,
      };
}
