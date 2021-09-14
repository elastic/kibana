/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
        this.server.router.get(routeDefinition, handler);
        break;
      case 'POST':
        this.server.router.post(routeDefinition, handler);
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  }
}
