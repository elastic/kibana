/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { GisMap } from '../../connected_components/gis_map';
import 'mapbox-gl/dist/mapbox-gl.css';
import { esFilters } from '../../../../../../src/plugins/data/public';

export class MapsRoot extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  addFilters = (newFilters) => {
    const { updateFiltersAndDispatch, filters } = this.props;
    newFilters.forEach((filter) => {
      filter.$state = { store: esFilters.FilterStateStore.APP_STATE };
    });
    updateFiltersAndDispatch([...filters, ...newFilters]);
  };

  render() {
    return (
      <div id="react-maps-root">
        <GisMap addFilters={this.addFilters} />
      </div>
    );
  }
}
