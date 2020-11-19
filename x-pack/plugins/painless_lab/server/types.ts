/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { License } from './services';

export interface RouteDependencies {
  router: IRouter;
  license: License;
}

export interface Dependencies {
  licensing: LicensingPluginSetup;
}
