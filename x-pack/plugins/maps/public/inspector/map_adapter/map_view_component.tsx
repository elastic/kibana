/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import type { Adapters } from '@kbn/inspector-plugin/public';
import { MapDetails } from './map_details';
import { Stats } from './types';

interface Props {
  adapters: Adapters;
}

interface State {
  stats: Stats;
  style: string;
}

class MapViewComponent extends Component<Props, State> {
  state: State = this.props.adapters.map.getMapState();

  _onMapChange = () => {
    this.setState(this.props.adapters.map.getMapState());
  };

  componentDidMount() {
    this.props.adapters.map.on('change', this._onMapChange);
  }

  componentWillUnmount() {
    this.props.adapters.map.removeListener('change', this._onMapChange);
  }

  render() {
    return (
      <MapDetails
        centerLon={this.state.stats.center[0]}
        centerLat={this.state.stats.center[1]}
        zoom={this.state.stats.zoom}
        style={this.state.style}
      />
    );
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export default MapViewComponent;
