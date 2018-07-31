/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FlyOut } from '../flyout/index';
import * as ol from 'openlayers';

export class KibanaMap extends React.Component {

  constructor() {
    super();
  }

  componentDidMount() {
    const { olMap, olLayers } = this.props;
    olMap.setTarget(this.refs.mapContainer);
    this._addLayers(olLayers);
  }

  componentWillReceiveProps(props) {
    this._addLayers(props.olLayers);
  }

  _addLayers = (layers) => {
    const { olMap } = this.props;
    olMap.setLayerGroup(new ol.layer.Group());
    layers.forEach(layer=> {
      olMap.addLayer(layer.olLayer);
    });
  };

  render() {
    return (
      <div>
        <div className="mapContainer" ref="mapContainer"/>
        <FlyOut/>
      </div>
    );
  }
}
