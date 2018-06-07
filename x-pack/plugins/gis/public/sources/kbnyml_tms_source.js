/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ASource } from './source';
import { parse as parseUrl } from 'url';

/**
 * There's only single TMS configuration in kibana.yml
 */
export class KbnYmlTMSSource extends ASource {

  constructor(options) {
    super();
    this._kbnCoreAPI = options.kbnCoreAPI;
    this._urlTemplate = (this._kbnCoreAPI.mapConfig.tilemap && this._kbnCoreAPI.mapConfig.tilemap.url) ?
      this._kbnCoreAPI.mapConfig.tilemap.url : null;
  }

  getDisplayName() {
    const parsedUrl = parseUrl(this._urlTemplate);
    return parsedUrl.hostname;
  }

  async getUrlTemplate() {
    if (!this._kbnCoreAPI.mapConfig.tilemap || !this._kbnCoreAPI.mapConfig.tilemap.url) {
      throw new Error('no tilemap configuration');
    }
    return this._urlTemplate;
  }
}
