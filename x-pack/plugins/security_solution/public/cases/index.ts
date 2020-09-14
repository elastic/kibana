/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecuritySubPlugin } from '../app/types';
import { CasesRoutes } from './routes';
import { createCaseSettingsRegistry } from './settings_registry';
import { registerCaseSettings } from './components/settings';
import { CaseSettingsRegistry } from './types';

export class Cases {
  private caseSettingsRegistry: CaseSettingsRegistry;

  constructor() {
    this.caseSettingsRegistry = createCaseSettingsRegistry();
  }

  public setup() {
    registerCaseSettings({ caseSettingsRegistry: this.caseSettingsRegistry });
    return {
      caseSettingsRegistry: this.caseSettingsRegistry,
    };
  }

  public start(): SecuritySubPlugin {
    return {
      SubPluginRoutes: CasesRoutes,
    };
  }
}
