/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { License } from './services';
import type { AlertingPlugin } from '../../alerting/server';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  alerting?: AlertingPlugin['setup'];
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
}
