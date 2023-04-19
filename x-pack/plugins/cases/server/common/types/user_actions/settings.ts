/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Settings } from '../settings';
import type { ActionTypes } from './common';

export interface SettingsUserAction {
  type: typeof ActionTypes.settings;
  payload: {
    settings: Settings;
  };
}
