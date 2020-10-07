/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Service, IRouter, AlertingSetup } from '../types';
import { register as registerIndexThreshold } from './index_threshold';
import { register as registerGeoThreshold } from './geo_threshold';

interface RegisterAlertTypesParams {
  service: Service;
  router: IRouter;
  alerts: AlertingSetup;
  baseRoute: string;
}

export function registerBuiltInAlertTypes(params: RegisterAlertTypesParams) {
  registerIndexThreshold(params);
  registerGeoThreshold(params);
}
