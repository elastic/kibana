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

  static renderDropdownDisplayOption() {
    throw new Error('Must implement Source.renderDropdownDisplayOption');
  }

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  destroy() {}

  renderDetails() {
    return (<div>{`Here be details for source`}</div>);
  }

  _createDefaultLayerDescriptor() {
    throw new Error(`Source#createDefaultLayerDescriptor not implemented`);
  }

  createDefaultLayer() {
    throw new Error(`Source#createDefaultLayer not implemented`);
  }

  async getDisplayName() {
    console.warn('Source should implement Source#getDisplayName');
    return '';
  }

  isFieldAware() {
    return false;
  }

  isRefreshTimerAware() {
    return false;
  }

  isQueryAware() {
    return false;
  }

  getFieldNames() {
    return [];
  }

  hasCompleteConfig() {
    throw new Error(`Source#hasCompleteConfig not implemented`);
  }

  renderSourceSettingsEditor() {
    return null;
  }

  getIndexPatternIds() {
    return  [];
  }
}


