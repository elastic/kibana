/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../common/constants/monitor_management';

export const PARAMS_KEYS_TO_SKIP = [
  'secrets',
  'fields',
  ConfigKey.LOCATIONS,
  ConfigKey.TLS_VERSION,
  ConfigKey.SOURCE_PROJECT_CONTENT,
  ConfigKey.SOURCE_INLINE,
];
