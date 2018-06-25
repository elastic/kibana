/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ALayer } from './layer';
import { EuiIcon } from '@elastic/eui';


export class VectorLayer extends ALayer {

  constructor(vectorSource) {
    super();
    this._vectorSource = vectorSource;
  }

  getType() {
    return "Vector";
  }

  getLayerName() {
    return this._vectorSource.getDisplayName();
  }

  renderSmallLegend() {
    return (<EuiIcon type="vector" />);
  }
}
