/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as ol from 'openlayers';

import {} from '@elastic/eui';

export class TileLayer extends React.Component {

  constructor(tmsSource) {
    super();
    this._tmsSource = tmsSource;
  }

  async getOLLayer() {
    const urlTemplate = await this._tmsSource.getUrlTemplate();
    return new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: urlTemplate
      })
    });
  }
}
