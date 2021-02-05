/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from 'src/core/server';
import { registerSettings } from './ui_settings';

export class BannersPlugin implements Plugin<{}, {}, {}, {}> {
  setup({ uiSettings }: CoreSetup<{}, {}>) {
    registerSettings(uiSettings);
    return {};
  }

  start() {
    return {};
  }
}
