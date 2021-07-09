/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { RacRequestHandlerContext } from '../types';
import { getAlertByIdRoute } from './get_alert_by_id';
import { updateAlertByIdRoute } from './update_alert_by_id';
import { getAlertsIndexRoute } from './get_alert_index';

export function defineRoutes(router: IRouter<RacRequestHandlerContext>) {
  getAlertByIdRoute(router);
  updateAlertByIdRoute(router);
  getAlertsIndexRoute(router);
}
