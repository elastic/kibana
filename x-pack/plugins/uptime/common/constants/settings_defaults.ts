/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicSettings } from '../runtime_types';

export const DYNAMIC_SETTINGS_DEFAULTS: DynamicSettings = {
  heartbeatIndices: 'heartbeat-8*',
  certAgeThreshold: 730,
  certExpirationThreshold: 30,
  defaultConnectors: [],
};
