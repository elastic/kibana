/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GIS_API_PATH } from '../../../../common/constants';

export class EMSFileSource {

  static type = 'EMS_FILE';

  static createDescriptor(name) {
    return {
      type: EMSFileSource.type,
      name: name
    };
  }

  static async getGeoJson(descriptor) {
    try {
      const vectorFetch = await fetch(`../${GIS_API_PATH}/data/ems?name=${encodeURIComponent(descriptor.name)}`);
      return await vectorFetch.json();
    } catch(e) {
      console.error(e);
      throw e;
    }
  }

}
