/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export class ASource {

  static renderEditor() {
    throw new Error('Must implement Source.renderEditor');
  }

  static createDescriptor() {
    throw new Error('Must implement Source.createDescriptor');
  }

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  renderDetails() {
    return (<div>{`Here be details for source`}</div>);
  }

  async _createDefaultLayerDescriptor() {
    throw new Error(`Source#createDefaultLayerDescriptor not implemented`);
  }

  async createDefaultLayer() {
    throw new Error(`Source#createDefaultLayer not implemented`);
  }

  getDisplayName() {
    console.warn('Source should implement Source#getDisplayName');
    return '';
  }
}

export class TMSSource extends ASource {
  getUrlTemplate() {
    throw new Error('Should implement TMSSource#getUrlTemplate');
  }
}
