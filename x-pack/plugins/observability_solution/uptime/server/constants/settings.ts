/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicSettingsAttributes } from '../runtime_types/settings';

export const DYNAMIC_SETTINGS_DEFAULTS: DynamicSettingsAttributes = {
  heartbeatIndices: 'heartbeat-*',
  certAgeThreshold: 730,
  certExpirationThreshold: 30,
  defaultConnectors: [],
  defaultEmail: {
    to: [],
    cc: [],
    bcc: [],
  },
};

export const DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES: DynamicSettingsAttributes =
  DYNAMIC_SETTINGS_DEFAULTS;
