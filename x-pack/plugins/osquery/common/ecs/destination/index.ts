/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoEcs } from '../geo';

export interface DestinationEcs {
  bytes?: number[];
  ip?: string[];
  port?: number[];
  domain?: string[];
  geo?: GeoEcs;
  packets?: number[];
}
