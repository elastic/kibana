/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { License } from './services';

export interface Dependencies {
  licensing: LicensingPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
}
