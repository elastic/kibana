/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecuritySubPlugins } from '../app/types';
import { getOverviewRoutes } from './routes';

export class Overview {
  public setup() {}

  public start(): SecuritySubPlugins {
    return {
      routes: getOverviewRoutes(),
      store: {},
    };
  }
}
