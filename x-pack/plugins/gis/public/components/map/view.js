/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AddLayerPanel } from '../layer_addpanel/index';

export class OLMapContainer extends React.Component {

  componentDidMount() {
    this.props.olMap.setTarget(this.refs.mapContainer);
  }

  render() {
    return (
      <div>
        <div className="mapContainer" ref="mapContainer"/>
        <AddLayerPanel/>
      </div>
    );
  }
}
