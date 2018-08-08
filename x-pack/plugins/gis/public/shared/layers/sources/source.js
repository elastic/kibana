/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const DATA_ORIGIN = {
  EMS: 'EMS',
  WMS: 'WMS',
  TMS: 'TMS',
  CONFIG: 'CONFIG',
  INDEX_PATTERN: 'INDEX_PATTERN',
  SAVED_SEARCH: 'SAVED_SEARCH'
};

export class ASource {

  static create(options) {
    const sourceDescriptor = {};
    sourceDescriptor.name = options.name;
    sourceDescriptor.dataOrigin = this._setDataOrigin(options);
    sourceDescriptor.service = this._processServices(options.service);
    return sourceDescriptor;
  }

  static _setDataOrigin({ dataOrigin }) {
    if (DATA_ORIGIN.hasOwnProperty(dataOrigin)) {
      return dataOrigin;
    } else {
      throw new Error(`Expected one of the following values for data origin: `
        + `${Object.keys(DATA_ORIGIN)}`);
    }
  }

  static _processServices(services) {
    // Assign id if missing
    return services.map(service => service.id ? service :
      { ...service, id: Math.random().toString(36).substr(2, 5) });
  }
}
