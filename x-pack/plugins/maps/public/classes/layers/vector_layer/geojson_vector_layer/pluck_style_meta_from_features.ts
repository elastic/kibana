/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from 'geojson';
import { GEO_JSON_TYPE, KBN_IS_CENTROID_FEATURE, VECTOR_SHAPE_TYPE } from '../../../../../common/constants';
import { DynamicStylePropertyOptions, StyleMetaDescriptor } from '../../../../../common/descriptor_types';
import { IDynamicStyleProperty } from '../../../styles/vector/properties/dynamic_style_property';

const POINTS = [GEO_JSON_TYPE.POINT, GEO_JSON_TYPE.MULTI_POINT];
const LINES = [GEO_JSON_TYPE.LINE_STRING, GEO_JSON_TYPE.MULTI_LINE_STRING];
const POLYGONS = [GEO_JSON_TYPE.POLYGON, GEO_JSON_TYPE.MULTI_POLYGON];

export async function pluckStyleMetaFromFeatures(
  features: Feature[],
  supportedFeatures: VECTOR_SHAPE_TYPE[],
  dynamicProperties: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>,
): Promise<StyleMetaDescriptor> {
  const hasFeatureType = {
    [VECTOR_SHAPE_TYPE.POINT]: false,
    [VECTOR_SHAPE_TYPE.LINE]: false,
    [VECTOR_SHAPE_TYPE.POLYGON]: false,
  };
  if (supportedFeatures.length > 1) {
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];

      // ignore centroid features as they are added for styling and not part of the real data set
      if (feature.properties?.[KBN_IS_CENTROID_FEATURE]) {
        continue;
      }

      if (!hasFeatureType[VECTOR_SHAPE_TYPE.POINT] && POINTS.includes(feature.geometry.type as GEO_JSON_TYPE)) {
        hasFeatureType[VECTOR_SHAPE_TYPE.POINT] = true;
      }
      if (!hasFeatureType[VECTOR_SHAPE_TYPE.LINE] && LINES.includes(feature.geometry.type as GEO_JSON_TYPE)) {
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
        supportedFeatures,
        hasFeatureType
      ),
      isLinesOnly: isOnlySingleFeatureType(
        VECTOR_SHAPE_TYPE.LINE,
        supportedFeatures,
        hasFeatureType
      ),
      isPolygonsOnly: isOnlySingleFeatureType(
        VECTOR_SHAPE_TYPE.POLYGON,
        supportedFeatures,
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
      const categories = dynamicProperty.pluckCategoricalStyleMetaFromFeatures(features);
      if (categories.length) {
        styleMeta.fieldMeta[name].categories = categories;
      }
      const ordinalStyleMeta = dynamicProperty.pluckOrdinalStyleMetaFromFeatures(features);
      if (ordinalStyleMeta) {
        styleMeta.fieldMeta[name].range = ordinalStyleMeta;
      }
    }
  );

  return styleMeta;
}

export function isOnlySingleFeatureType(
  featureType: VECTOR_SHAPE_TYPE,
  supportedFeatures: VECTOR_SHAPE_TYPE[],
  hasFeatureType: { [key in keyof typeof VECTOR_SHAPE_TYPE]: boolean }
): boolean {
  if (supportedFeatures.length === 1) {
    return supportedFeatures[0] === featureType;
  }

  const featureTypes = Object.keys(hasFeatureType);
  // @ts-expect-error
  return featureTypes.reduce((accumulator: boolean, featureTypeKey: VECTOR_SHAPE_TYPE) => {
    const hasFeature = hasFeatureType[featureTypeKey];
    return featureTypeKey === featureType ? accumulator && hasFeature : accumulator && !hasFeature;
  }, true);
}