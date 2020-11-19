/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecuritySubPlugin } from '../app/types';
import { CasesRoutes } from './routes';

export class Cases {
  public setup() {}

  public start(): SecuritySubPlugin {
    return {
      SubPluginRoutes: CasesRoutes,
    };
  }
}
