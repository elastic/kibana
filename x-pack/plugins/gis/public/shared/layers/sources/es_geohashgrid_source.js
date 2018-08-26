/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiButton
} from '@elastic/eui';

import { ASource } from './source';
import { GeohashGridLayer } from '../geohashgrid_layer';
import { GIS_API_PATH } from '../../../../common/constants';

export class ESGeohashGridSource extends ASource {

  static type = 'ES_GEOHASH_GRID';

  static createDescriptor({ esIndexPattern, pointField }) {
    return {
      type: ESGeohashGridSource.type,
      esIndexPattern: esIndexPattern,
      pointField: pointField
    };
  }

  static renderEditor({ onPreviewSource }) {
    return (
      <Fragment>
        <EuiButton
          size="s"
          onClick={() => {
            const sourceDescriptor = ESGeohashGridSource.createDescriptor({
              esIndexPattern: "log*",
              pointField: "geo.coordinates"
            });
            const source = new ESGeohashGridSource(sourceDescriptor);
            onPreviewSource(source);
          }}
        >
          Show heatmap for log* index with geo.coordinates field.
        </EuiButton>
      </Fragment>
    );
  }

  renderDetails() {
    return (
      <Fragment>
        <div>
          <span className="bold">Type: </span><span>Geohash grid (todo, use icon)</span>
        </div>
        <div>
          <span className="bold">Index pattern: </span><span>{this._descriptor.esIndexPattern}</span>
        </div>
        <div>
          <span className="bold">Point field: </span><span>{this._descriptor.pointField}</span>
        </div>
      </Fragment>
    );
  }

  async getGeoJsonPointsWithTotalCount(precision, extent) {
    try {
      let url = `../${GIS_API_PATH}/data/geohash_grid`;
      url += `?index_pattern=${encodeURIComponent(this._descriptor.esIndexPattern)}`;
      url += `&geo_point_field=${encodeURIComponent(this._descriptor.pointField)}`;
      url += `&precision=${precision}`;
      url += `&minlon=${extent[0]}`;
      url += `&maxlon=${extent[2]}`;
      url += `&minlat=${extent[1]}`;
      url += `&maxlat=${extent[3]}`;
      const data = await fetch(url);
      return data.json();
    } catch (e) {
      console.error('Cant load data', e);
      return { type: 'FeatureCollection', features: [] };
    }
  }

  _createDefaultLayerDescriptor(options) {
    return GeohashGridLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
  }

  createDefaultLayer(options) {
    return new GeohashGridLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this
    });
  }

  getDisplayName() {
    return this._descriptor.esIndexPattern + ' grid';
  }


}
