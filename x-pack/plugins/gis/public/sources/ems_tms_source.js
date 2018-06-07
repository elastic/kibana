/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ASource } from './source';

export class EMSTMSSource extends ASource {

  constructor(options) {
    super();
    this._kbnCoreAPI = options.kbnCoreAPI;
    this._serviceId = options.serviceId;
  }

  getDisplayName() {
    return `EMS: ${this._serviceId}`;
  }

  async getUrlTemplate() {

    const services = await this._kbnCoreAPI.serviceSettings.getTMSServices();
    const service = services.find((file) => {
      return file.id === this._serviceId;
    });

    if (!service) {
      throw new Error('Cannot find service');
    }

    return service.url;

  }
}
