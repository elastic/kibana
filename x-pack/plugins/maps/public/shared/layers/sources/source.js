/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class AbstractSource {

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

  /**
   * return list of immutable source properties.
   * Immutable source properties are properties that can not be edited by the user.
   */
  async getImmutableProperties() {
    return [];
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

  /**
   * return attribution for this layer as array of objects with url and label property.
   * e.g. [{ url: 'example.com', label: 'foobar' }]
   * @return {Promise<null>}
   */
  async getAttributions() {
    return [];
  }

  isFieldAware() {
    return false;
  }

  isRefreshTimerAware() {
    return false;
  }

  isGeoGridPrecisionAware() {
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

  getGeoGridPrecision() {
    return 0;
  }
}


