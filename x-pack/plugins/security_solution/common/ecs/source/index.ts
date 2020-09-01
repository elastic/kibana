/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GeoEcs } from '../geo';

export interface SourceEcs {
  bytes?: number[];

  ip?: string[];

  port?: number[];

  domain?: string[];

  geo?: GeoEcs;

  packets?: number[];
}
