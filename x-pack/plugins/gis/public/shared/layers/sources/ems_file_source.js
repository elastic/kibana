/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class EMSFileSource {

  static type = 'EMS_FILE';

  static createDescriptor(name) {
    return {
      type: EMSFileSource.type,
      name: name
    };
  }

  static async createEMSFileListDescriptor(kbnModules) {
    return {
      type: EMSFileSource.type,
      service: await kbnModules.serviceSettings.getFileLayers()
    };
  }

  static async getGeoJson(descriptor, fileLayers) {
    // const fileLayers = await kbnModules.serviceSettings.getFileLayers();
    const file = fileLayers.find((file) => file.name === descriptor.name);
    const vectorFetch = await fetch(file.url);
    return await vectorFetch.json();
  }

}
