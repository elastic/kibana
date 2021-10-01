/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySubPlugin } from '../app/types';
import { routes } from './routes';

export class Overview {
  public setup() {}

  public start(): SecuritySubPlugin {
    return {
      routes,
    };
  }
}
