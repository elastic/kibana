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
import { Feature } from 'geojson';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import * as jsts from 'jsts';
import { getToasts } from '../../../../kibana_services';
import { DrawControl } from '../';
import { DRAW_TYPE } from '../../../../../common';

const geoJSONReader = new jsts.io.GeoJSONReader();

export interface Props {
  addNewFeature: (indexName: string, geometry: unknown, mappings: unknown) => void;
  disableDrawState: () => void;
  removeFeatures: (featureIds: string[]) => void;
  drawType: DRAW_TYPE;
  mbMap: MbMap;
}

export class DrawFeatureControl extends Component<Props, {}> {
  _onFeaturesSelected = (mbDrawControl: MapboxDraw) => (e: { features: Feature[] }) => {
    if (this.props.drawType === DRAW_TYPE.TRASH) {
      const featureIds = e.features
        .map((feature: Feature) => {
          return feature.id ? `${feature.id}` : '';
        })
        .filter((id) => id);
      this.props.removeFeatures(featureIds);
      mbDrawControl.trash();
    }
  };

  _onDraw = (mbDrawControl: MapboxDraw) => async (e: { features: Feature[] }) => {
    try {
      e.features.forEach((feature: Feature) => {
        const { geometry } = geoJSONReader.read(feature);
        if (!geometry.isSimple() || !geometry.isValid()) {
          mbDrawControl.delete(feature.id);
          throw new Error('Invalid geometry detected');
        }
        this.props.addNewFeature('someIndex', geometry, 'somePath');
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
    }
  };

  render() {
    return (
      <DrawControl
        drawType={this.props.drawType}
        onDraw={this._onDraw}
        onFeaturesSelected={this._onFeaturesSelected}
        mbMap={this.props.mbMap}
        drawActive={true}
      />
    );
  }
}
