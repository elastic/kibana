/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UptimeCoreSetup } from './adapter_types';
import { UMBackendFrameworkAdapter } from './adapter_types';
import { UMKibanaRoute } from '../../../rest_api';

export class UMKibanaBackendFrameworkAdapter implements UMBackendFrameworkAdapter {
  constructor(private readonly server: UptimeCoreSetup) {
    this.server = server;
  }

  public registerRoute({ handler, method, options, path, validate }: UMKibanaRoute) {
    const routeDefinition = {
      path,
      validate,
      options,
    };
    switch (method) {
      case 'GET':
        this.server.route.get(routeDefinition, handler);
        break;
      case 'POST':
        this.server.route.post(routeDefinition, handler);
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  }
}
