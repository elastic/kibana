/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from 'src/core/server';
import { AlertingSetup, StackAlertsStartDeps } from '../types';
import { register as registerIndexThreshold } from './index_threshold';
import { register as registerGeoContainment } from './geo_containment';
import { register as registerEsQuery } from './es_query';
interface RegisterAlertTypesParams {
  logger: Logger;
  data: Promise<StackAlertsStartDeps['triggersActionsUi']['data']>;
  alerting: AlertingSetup;
  core: CoreSetup;
}

export function registerBuiltInAlertTypes(params: RegisterAlertTypesParams) {
  registerIndexThreshold(params);
  registerGeoContainment(params);
  registerEsQuery(params);
}
