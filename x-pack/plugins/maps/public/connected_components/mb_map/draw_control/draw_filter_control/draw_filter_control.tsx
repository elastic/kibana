/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { Map as MbMap } from 'mapbox-gl';
import { i18n } from '@kbn/i18n';
import { Filter } from 'src/plugins/data/public';
import { Feature, Polygon } from 'geojson';
import { DRAW_TYPE, ES_SPATIAL_RELATIONS } from '../../../../../common/constants';
import { DrawState } from '../../../../../common/descriptor_types';
import {
  createDistanceFilterWithMeta,
  createSpatialFilterWithGeometry,
  getBoundingBoxGeometry,
  roundCoordinates,
} from '../../../../../common/elasticsearch_util';
import { getToasts } from '../../../../kibana_services';
import { DrawControl } from '../draw_control';
import { DrawCircleProperties } from '../draw_circle';

export interface Props {
  addFilters: (filters: Filter[], actionId: string) => Promise<void>;
  disableDrawState: () => void;
  drawState?: DrawState;
  isDrawingFilter: boolean;
  mbMap: MbMap;
}

export class DrawFilterControl extends Component<Props, {}> {
  _onDraw = async (e: { features: Feature[] }) => {
    if (
      !e.features.length ||
      !this.props.drawState ||
      !this.props.drawState.geoFieldName ||
      !this.props.drawState.indexPatternId
    ) {
      return;
    }

    let filter: Filter | undefined;
    if (this.props.drawState.drawType === DRAW_TYPE.DISTANCE) {
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
        alias: this.props.drawState.filterLabel ? this.props.drawState.filterLabel : '',
        distanceKm,
        geoFieldName: this.props.drawState.geoFieldName,
        indexPatternId: this.props.drawState.indexPatternId,
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
          this.props.drawState.drawType === DRAW_TYPE.BOUNDS
            ? getBoundingBoxGeometry(geometry)
            : geometry,
        indexPatternId: this.props.drawState.indexPatternId,
        geoFieldName: this.props.drawState.geoFieldName,
        geometryLabel: this.props.drawState.geometryLabel ? this.props.drawState.geometryLabel : '',
        relation: this.props.drawState.relation
          ? this.props.drawState.relation
          : ES_SPATIAL_RELATIONS.INTERSECTS,
      });
    }

    try {
      await this.props.addFilters([filter!], this.props.drawState.actionId);
    } catch (error) {
      getToasts().addWarning(
        i18n.translate('xpack.maps.drawFilterControl.unableToCreatFilter', {
          defaultMessage: `Unable to create filter, error: '{errorMsg}'.`,
          values: {
            errorMsg: error.message,
          },
        })
      );
    } finally {
      this.props.disableDrawState();
    }
  };

  render() {
    return (
      <DrawControl
        drawType={
          this.props.isDrawingFilter && this.props.drawState
            ? this.props.drawState.drawType
            : undefined
        }
        onDraw={this._onDraw}
        mbMap={this.props.mbMap}
      />
    );
  }
}
