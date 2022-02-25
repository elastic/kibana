/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { Map as MbMap, Point as MbPoint } from '@kbn/mapbox-gl';
// @ts-expect-error
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Feature, Geometry, Position } from 'geojson';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import * as jsts from 'jsts';
import { MapMouseEvent } from '@kbn/mapbox-gl';
import { getToasts } from '../../../../kibana_services';
import { DrawControl } from '../draw_control';
import { DRAW_MODE, DRAW_SHAPE } from '../../../../../common/constants';
import { ILayer } from '../../../../classes/layers/layer';
import { EXCLUDE_CENTROID_FEATURES } from '../../../../classes/util/mb_filter_expressions';

const geoJSONReader = new jsts.io.GeoJSONReader();

export interface ReduxStateProps {
  drawShape?: DRAW_SHAPE;
  drawMode: DRAW_MODE;
  editLayer: ILayer | undefined;
}

export interface ReduxDispatchProps {
  addNewFeatureToIndex: (geometries: Array<Geometry | Position[]>) => void;
  deleteFeatureFromIndex: (featureId: string) => void;
}

export interface OwnProps {
  mbMap: MbMap;
}

type Props = ReduxStateProps & ReduxDispatchProps & OwnProps;

export class DrawFeatureControl extends Component<Props, {}> {
  _onDraw = async (e: { features: Feature[] }, mbDrawControl: MapboxDraw) => {
    try {
      const geometries: Array<Geometry | Position[]> = [];
      e.features.forEach((feature: Feature) => {
        const { geometry } = geoJSONReader.read(feature);
        if (!geometry.isSimple() || !geometry.isValid()) {
          throw new Error(
            i18n.translate('xpack.maps.drawFeatureControl.invalidGeometry', {
              defaultMessage: `Invalid geometry detected`,
            })
          );
        }
        if ('coordinates' in feature.geometry) {
          // @ts-ignore /* Single position array only used if point geometry */
          const featureGeom: Geometry | Position[] =
            this.props.drawMode === DRAW_MODE.DRAW_POINTS
              ? feature.geometry.coordinates
              : feature.geometry;
          geometries.push(featureGeom);
        }
      });

      if (geometries.length) {
        this.props.addNewFeatureToIndex(geometries);
      }
    } catch (error) {
      getToasts().addWarning(
        i18n.translate('xpack.maps.drawFeatureControl.unableToCreateFeature', {
          defaultMessage: `Unable to create feature, error: '{errorMsg}'.`,
          values: {
            errorMsg: error.message,
          },
        })
      );
    } finally {
      try {
        mbDrawControl.deleteAll();
      } catch (_e) {
        // Fail silently. Always works, but sometimes produces an upstream error in the mb draw lib
      }
    }
  };

  _onClick = async (event: MapMouseEvent, drawControl?: MapboxDraw) => {
    const mbLngLatPoint: MbPoint = event.point;
    // Currently feature deletion is the only onClick handling
    if (!this.props.editLayer || this.props.drawShape !== DRAW_SHAPE.DELETE) {
      return;
    }

    const mbEditLayerIds = this.props.editLayer
      .getMbLayerIds()
      .filter((mbLayerId) => !!this.props.mbMap.getLayer(mbLayerId));
    const PADDING = 2; // in pixels
    const mbBbox = [
      {
        x: mbLngLatPoint.x - PADDING,
        y: mbLngLatPoint.y - PADDING,
      },
      {
        x: mbLngLatPoint.x + PADDING,
        y: mbLngLatPoint.y + PADDING,
      },
    ] as [MbPoint, MbPoint];
    const selectedFeatures = this.props.mbMap.queryRenderedFeatures(mbBbox, {
      layers: mbEditLayerIds,
      filter: ['all', EXCLUDE_CENTROID_FEATURES],
    });
    if (!selectedFeatures.length) {
      return;
    }
    const topMostFeature = selectedFeatures[0];

    try {
      if (!(topMostFeature.properties && topMostFeature.properties._id)) {
        throw Error(`Associated Elasticsearch document id not found`);
      }
      const docId = topMostFeature.properties._id;
      this.props.deleteFeatureFromIndex(docId);
    } catch (error) {
      getToasts().addWarning(
        i18n.translate('xpack.maps.drawFeatureControl.unableToDeleteFeature', {
          defaultMessage: `Unable to delete feature, error: '{errorMsg}'.`,
          values: {
            errorMsg: error.message,
          },
        })
      );
    }
  };

  render() {
    return (
      <DrawControl
        drawShape={this.props.drawShape}
        onDraw={this._onDraw}
        onClick={this._onClick}
        mbMap={this.props.mbMap}
        enable={true}
      />
    );
  }
}
