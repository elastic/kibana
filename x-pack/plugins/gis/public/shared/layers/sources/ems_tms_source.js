/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ASource } from './source';

export class EMSTMSSource extends  ASource {

  static type = 'EMS_TMS';

  static createDescriptor(serviceId) {
    return {
      type: EMSTMSSource.type,
      id: serviceId
    };
  }

  static async getTMSOptions(descriptor, services) {
    return services.find(service => {
      return service.id === descriptor.id;
    });
  }

  constructor(descriptor) {
    super(descriptor);
  }
}
