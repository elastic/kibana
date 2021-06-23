/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { Map as MbMap } from 'mapbox-gl';
// @ts-expect-error
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Feature, Geometry, Position } from 'geojson';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import * as jsts from 'jsts';
import { getToasts } from '../../../../kibana_services';
import { DrawControl } from '../';
import { DRAW_MODE, DRAW_SHAPE } from '../../../../../common';

const geoJSONReader = new jsts.io.GeoJSONReader();

export interface ReduxStateProps {
  drawShape?: DRAW_SHAPE;
  drawMode: DRAW_MODE;
}

export interface ReduxDispatchProps {
  addNewFeatureToIndex: (geometry: Geometry | Position[]) => void;
  disableDrawState: () => void;
}

export interface OwnProps {
  mbMap: MbMap;
}

type Props = ReduxStateProps & ReduxDispatchProps & OwnProps;

export class DrawFeatureControl extends Component<Props, {}> {
  _onDraw = async (e: { features: Feature[] }, mbDrawControl: MapboxDraw) => {
    try {
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
          this.props.addNewFeatureToIndex(featureGeom);
        }
      });
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
      this.props.disableDrawState();
      try {
        mbDrawControl.deleteAll();
      } catch (_e) {
        // Fail silently. Always works, but sometimes produces an upstream error in the mb draw lib
      }
    }
  };

  render() {
    return (
      <DrawControl
        drawShape={this.props.drawShape}
        onDraw={this._onDraw}
        mbMap={this.props.mbMap}
        enable={true}
      />
    );
  }
}
