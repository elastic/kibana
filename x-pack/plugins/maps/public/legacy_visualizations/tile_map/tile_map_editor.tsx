/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { Vis } from '../../../../../../src/plugins/visualizations/public';
import { getData, getShareService } from '../../kibana_services';
import { ViewInMaps } from '../view_in_maps';
import { COORDINATE_MAP_TITLE, extractLayerDescriptorParams } from './utils';

interface Props {
  vis: Vis;
}

interface State {
}

export class TileMapEditor extends Component<{}, State> {
  private _isMounted = false;
  state: State = {};

  componentDidMount() {
    console.log(this.props);
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const locator = getShareService().url.locators.get('MAPS_APP_TILE_MAP_LOCATOR');
    if (!locator) return;

    const query = getData().query;
    locator.navigate({
      ...(extractLayerDescriptorParams(this.props.vis)),
      filters: query.filterManager.getFilters(),
      query: query.queryString.getQuery(),
      timeRange: query.timefilter.timefilter.getTime(),
    });

  }

  render() {
    return <ViewInMaps onClick={this._onClick} visualizationLabel={COORDINATE_MAP_TITLE} />;
  }
}
