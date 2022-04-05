/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from 'geojson';
import {
  GEO_JSON_TYPE,
  KBN_IS_CENTROID_FEATURE,
  VECTOR_SHAPE_TYPE,
} from '../../../../../common/constants';
import {
  Category,
  DynamicStylePropertyOptions,
  RangeFieldMeta,
  StyleMetaDescriptor,
} from '../../../../../common/descriptor_types';
import { IDynamicStyleProperty } from '../../../styles/vector/properties/dynamic_style_property';

const POINTS = [GEO_JSON_TYPE.POINT, GEO_JSON_TYPE.MULTI_POINT];
const LINES = [GEO_JSON_TYPE.LINE_STRING, GEO_JSON_TYPE.MULTI_LINE_STRING];
const POLYGONS = [GEO_JSON_TYPE.POLYGON, GEO_JSON_TYPE.MULTI_POLYGON];

export async function pluckStyleMetaFromFeatures(
  features: Feature[],
  supportedShapeTypes: VECTOR_SHAPE_TYPE[],
  dynamicProperties: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>
): Promise<StyleMetaDescriptor> {
  const hasFeatureType = {
    [VECTOR_SHAPE_TYPE.POINT]: false,
    [VECTOR_SHAPE_TYPE.LINE]: false,
    [VECTOR_SHAPE_TYPE.POLYGON]: false,
  };
  if (supportedShapeTypes.length > 1) {
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];

      // ignore centroid features as they are added for styling and not part of the real data set
      if (feature.properties?.[KBN_IS_CENTROID_FEATURE]) {
        continue;
      }

      if (
        !hasFeatureType[VECTOR_SHAPE_TYPE.POINT] &&
        POINTS.includes(feature.geometry.type as GEO_JSON_TYPE)
      ) {
        hasFeatureType[VECTOR_SHAPE_TYPE.POINT] = true;
      }
      if (
        !hasFeatureType[VECTOR_SHAPE_TYPE.LINE] &&
        LINES.includes(feature.geometry.type as GEO_JSON_TYPE)
      ) {
        hasFeatureType[VECTOR_SHAPE_TYPE.LINE] = true;
      }
      if (
        !hasFeatureType[VECTOR_SHAPE_TYPE.POLYGON] &&
        POLYGONS.includes(feature.geometry.type as GEO_JSON_TYPE)
      ) {
        hasFeatureType[VECTOR_SHAPE_TYPE.POLYGON] = true;
      }
    }
  }

  const styleMeta = {
    geometryTypes: {
      isPointsOnly: isOnlySingleFeatureType(
        VECTOR_SHAPE_TYPE.POINT,
        supportedShapeTypes,
        hasFeatureType
      ),
      isLinesOnly: isOnlySingleFeatureType(
        VECTOR_SHAPE_TYPE.LINE,
        supportedShapeTypes,
        hasFeatureType
      ),
      isPolygonsOnly: isOnlySingleFeatureType(
        VECTOR_SHAPE_TYPE.POLYGON,
        supportedShapeTypes,
        hasFeatureType
      ),
    },
    fieldMeta: {},
  } as StyleMetaDescriptor;

  if (dynamicProperties.length === 0 || features.length === 0) {
    // no additional meta data to pull from source data request.
    return styleMeta;
  }

  dynamicProperties.forEach(
    (dynamicProperty: IDynamicStyleProperty<DynamicStylePropertyOptions>) => {
      const name = dynamicProperty.getFieldName();
      if (!styleMeta.fieldMeta[name]) {
        styleMeta.fieldMeta[name] = { categories: [] };
      }
      const categories = pluckCategoricalStyleMetaFromFeatures(dynamicProperty, features);
      if (categories.length) {
        styleMeta.fieldMeta[name].categories = categories;
      }
      const ordinalStyleMeta = pluckOrdinalStyleMetaFromFeatures(dynamicProperty, features);
      if (ordinalStyleMeta) {
        styleMeta.fieldMeta[name].range = ordinalStyleMeta;
      }
    }
  );

  return styleMeta;
}

function pluckOrdinalStyleMetaFromFeatures(
  property: IDynamicStyleProperty<DynamicStylePropertyOptions>,
  features: Feature[]
): RangeFieldMeta | null {
  if (!property.isOrdinal()) {
    return null;
  }

  const name = property.getFieldName();
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const newValue = feature.properties ? parseFloat(feature.properties[name]) : NaN;
    if (!isNaN(newValue)) {
      min = Math.min(min, newValue);
      max = Math.max(max, newValue);
    }
  }

  return min === Infinity || max === -Infinity
    ? null
    : {
        min,
        max,
        delta: max - min,
      };
}

export function pluckCategoricalStyleMetaFromFeatures(
  property: IDynamicStyleProperty<DynamicStylePropertyOptions>,
  features: Feature[]
): Category[] {
  const size = property.getNumberOfCategories();
  if (!property.isCategorical() || size <= 0) {
    return [];
  }

  const counts = new Map();
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const term = feature.properties ? feature.properties[property.getFieldName()] : undefined;
    // properties object may be sparse, so need to check if the field is effectively present
    if (typeof term !== undefined) {
      if (counts.has(term)) {
        counts.set(term, counts.get(term) + 1);
      } else {
        counts.set(term, 1);
      }
    }
  }

  const ordered: Category[] = [];
  for (const [key, value] of counts) {
    ordered.push({ key, count: value });
  }

  ordered.sort((a, b) => {
    return b.count - a.count;
  });
  return ordered.slice(0, size);
}

export function isOnlySingleFeatureType(
  featureType: VECTOR_SHAPE_TYPE,
  supportedShapeTypes: VECTOR_SHAPE_TYPE[],
  hasFeatureType: { [key in keyof typeof VECTOR_SHAPE_TYPE]: boolean }
): boolean {
  if (supportedShapeTypes.length === 1) {
    return supportedShapeTypes[0] === featureType;
  }

  const featureTypes = Object.keys(hasFeatureType);
  // @ts-expect-error
  return featureTypes.reduce((accumulator: boolean, featureTypeKey: VECTOR_SHAPE_TYPE) => {
    const hasFeature = hasFeatureType[featureTypeKey];
    return featureTypeKey === featureType ? accumulator && hasFeature : accumulator && !hasFeature;
  }, true);
}
