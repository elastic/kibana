/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { GisMap } from '../connected_components/gis_map';
import { createMapStore } from '../reducers/store';
import 'mapbox-gl/dist/mapbox-gl.css';

export class MapsCreateEditView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      store: createMapStore(),
    };
  }

  render() {
    const { store } = this.state;
    return (
      <Provider store={store}>
        <GisMap addFilters={null} />
      </Provider>
    );
  }
}
