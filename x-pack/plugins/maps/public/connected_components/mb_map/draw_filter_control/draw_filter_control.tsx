/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';
import { Map as MbMap } from 'mapbox-gl';
import { i18n } from '@kbn/i18n';
import { Filter } from 'src/plugins/data/public';
import { Feature, Polygon } from 'geojson';
import { DRAW_TYPE, ES_GEO_FIELD_TYPE, ES_SPATIAL_RELATIONS } from '../../../../common/constants';
import { DrawState } from '../../../../common/descriptor_types';
import {
  createDistanceFilterWithMeta,
  createSpatialFilterWithGeometry,
  getBoundingBoxGeometry,
  roundCoordinates,
} from '../../../../common/elasticsearch_util';
import { getToasts } from '../../../kibana_services';
import { DrawControl, DrawCircleProperties } from '../draw_control';

export interface Props {
  addFilters: (filters: Filter[], actionId: string) => Promise<void>;
  disableDrawState: () => void;
  drawState?: DrawState;
  isDrawingFilter: boolean;
  mbMap: MbMap;
}

export function DrawFilterControl(props: Props) {
  async function onDraw(e: { features: Feature[] }) {
    if (
      !e.features.length ||
      !props.drawState ||
      !props.drawState.geoFieldName ||
      !props.drawState.indexPatternId
    ) {
      return;
    }

    let filter: Filter | undefined;
    if (props.drawState.drawType === DRAW_TYPE.DISTANCE) {
      const circle = e.features[0] as Feature & { properties: DrawCircleProperties };
      const distanceKm = _.round(
        circle.properties.radiusKm,
        circle.properties.radiusKm > 10 ? 0 : 2
      );
      // Only include as much precision as needed for distance
      let precision = 2;
      if (distanceKm <= 1) {
        precision = 5;
      } else if (distanceKm <= 10) {
        precision = 4;
      } else if (distanceKm <= 100) {
        precision = 3;
      }
      filter = createDistanceFilterWithMeta({
        alias: props.drawState.filterLabel ? props.drawState.filterLabel : '',
        distanceKm,
        geoFieldName: props.drawState.geoFieldName,
        indexPatternId: props.drawState.indexPatternId,
        point: [
          _.round(circle.properties.center[0], precision),
          _.round(circle.properties.center[1], precision),
        ],
      });
    } else {
      const geometry = e.features[0].geometry as Polygon;
      // MapboxDraw returns coordinates with 12 decimals. Round to a more reasonable number
      roundCoordinates(geometry.coordinates);

      filter = createSpatialFilterWithGeometry({
        geometry:
          props.drawState.drawType === DRAW_TYPE.BOUNDS
            ? getBoundingBoxGeometry(geometry)
            : geometry,
        indexPatternId: props.drawState.indexPatternId,
        geoFieldName: props.drawState.geoFieldName,
        geoFieldType: props.drawState.geoFieldType
          ? props.drawState.geoFieldType
          : ES_GEO_FIELD_TYPE.GEO_POINT,
        geometryLabel: props.drawState.geometryLabel ? props.drawState.geometryLabel : '',
        relation: props.drawState.relation
          ? props.drawState.relation
          : ES_SPATIAL_RELATIONS.INTERSECTS,
      });
    }

    try {
      await props.addFilters([filter!], props.drawState.actionId);
    } catch (error) {
      getToasts().addWarning(
        i18n.translate('xpack.maps.drawControl.unableToCreatFilter', {
          defaultMessage: `Unable to create filter, error: '{errorMsg}'.`,
          values: {
            errorMsg: error.message,
          },
        })
      );
    } finally {
      props.disableDrawState();
    }
  }

  return (
    <DrawControl
      drawType={props.isDrawingFilter && props.drawState ? props.drawState.drawType : undefined}
      onDraw={onDraw}
      mbMap={props.mbMap}
    />
  );
}
