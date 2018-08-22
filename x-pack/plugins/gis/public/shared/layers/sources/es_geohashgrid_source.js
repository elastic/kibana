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
    //not points yet, because just relying on OL-vector fill/outlines now
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [0, 10], [10, 0], [10, 10], [0, 0]]]
          }
        }
      ]
    };
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
            onPreviewSource(sourceDescriptor);
          }}
        >
          Show some dummy data.
        </EuiButton>
      </Fragment>
    );
  }

  constructor(descriptor) {
    super(descriptor);
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
}
