/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import DUMMY_GEOJSON from './junk/points.json';

import {
  EuiButton
} from '@elastic/eui';

import { ASource } from './source';
import { GeohashGridLayer } from '../geohashgrid_layer';

export class ESGeohashGridSource extends ASource {

  static type = 'ES_GEOHASH_GRID';

  static createDescriptor({ esIndexPattern, pointField }) {
    return {
      type: ESGeohashGridSource.type,
      esIndexPattern: esIndexPattern,
      pointField: pointField
    };
  }

  static async getGeoJsonPoints({}) {
    //todo: placeholder now, obviously
    return DUMMY_GEOJSON;
  }

  static renderEditor({ onPreviewSource }) {
    return (
      <Fragment>
        <EuiButton
          size="s"
          onClick={() => {
            const sourceDescriptor = ESGeohashGridSource.createDescriptor({
              esIndexPattern: "foo",
              pointField: "bar"
            });
            const source = new ESGeohashGridSource(sourceDescriptor);
            onPreviewSource(source);
          }}
        >
          Show some dummy data.
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


  async createDefaultLayerDescriptor(options) {
    const geojson = await ESGeohashGridSource.getGeoJsonPoints(this._descriptor);
    return GeohashGridLayer.createDescriptor({
      source: geojson,
      sourceDescriptor: this._descriptor,
      name: this._descriptor.name || this._descriptor.id,
      ...options
    });
  }

}
