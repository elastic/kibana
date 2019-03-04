/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseString } from 'xml2js';

//https://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WMSServer

export class WmsClient {
  constructor({ serviceUrl, version = '1.1.1' }) {
    this.serviceUrl = serviceUrl;
    this.version = version
  }

  async _getCapabilities() {
    const resp = await fetch(`${this.serviceUrl}?version=${this.version}&request=GetCapabilities&service=WMS`);
    if (resp.status >= 400) {
      throw new Error(`Unable to access ${this.state.serviceUrl}`);
    }
    const body = await resp.text();

    const parsePromise = new Promise((resolve, reject) => {
      parseString(body, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    return await parsePromise;
  }

  async getLayers() {
    const capabilities = await this._getCapabilities();
    console.log('capabilities', capabilities);

    return [];
  }


}
