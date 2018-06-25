/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ALayer } from './layer';
import { EuiIcon } from '@elastic/eui';

export class TileLayer extends ALayer {

  constructor(tmsSource) {
    super();
    this._tmsSource = tmsSource;
  }

  getLayerName() {
    return this._tmsSource.getDisplayName();
  }

  getType() {
    return "Tile";
  }

  renderSmallLegend() {
    return (<EuiIcon type="grid" />);
  }
}
