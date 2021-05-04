/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Geometry } from 'geojson';
import { TooltipFeatureAction } from '../../../../common/descriptor_types';
import { GEO_JSON_TYPE, ES_GEO_FIELD_TYPE } from '../../../../common/constants';
import { GEOMETRY_FILTER_ACTION } from '../../../../common/descriptor_types';
import { GeoFieldWithIndex } from '../../../components/geo_field_with_index';

export function getFeatureActions({
  layerId,
  featureId,
  geometry,
  geoFields,
}: {
  layerId: string;
  featureId?: number | string;
  geometry: Geometry | null;
  geoFields: GeoFieldWithIndex[];
}): TooltipFeatureAction[] {
  const actions = [];

  const geoFieldsForFeature = filterGeoFieldsByFeatureGeometry(geometry, geoFields);
  if (geoFieldsForFeature.length) {
    actions.push({
      label: i18n.translate('xpack.maps.tooltip.action.filterByGeometryLabel', {
        defaultMessage: 'Filter by geometry',
      }),
      id: GEOMETRY_FILTER_ACTION as typeof GEOMETRY_FILTER_ACTION,
      context: {
        geometry,
        geoFields: geoFieldsForFeature,
      },
    });
  }

  return actions;
}

function filterGeoFieldsByFeatureGeometry(
  geometry: Geometry | null,
  geoFields: GeoFieldWithIndex[]
): GeoFieldWithIndex[] {
  if (!geometry) {
    return [];
  }

  // line geometry can only create filters for geo_shape fields.
  if (
    geometry.type === GEO_JSON_TYPE.LINE_STRING ||
    geometry.type === GEO_JSON_TYPE.MULTI_LINE_STRING
  ) {
    return geoFields.filter(({ geoFieldType }) => {
      return geoFieldType === ES_GEO_FIELD_TYPE.GEO_SHAPE;
    });
  }

  // TODO support geo distance filters for points
  if (geometry.type === GEO_JSON_TYPE.POINT || geometry.type === GEO_JSON_TYPE.MULTI_POINT) {
    return [];
  }

  return geoFields;
}
