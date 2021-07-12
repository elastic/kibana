/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { ViewInMaps } from '../view_in_maps';
import { COORDINATE_MAP_TITLE } from './utils';

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

  render() {
    return <ViewInMaps onClick={() => {}} visualizationLabel={COORDINATE_MAP_TITLE} />;
  }
}
