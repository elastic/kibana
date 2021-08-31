/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateAlertRoute } from './aggregate';
import { createAlertRoute } from './create';
import { deleteAlertRoute } from './delete';
import { findAlertRoute } from './find';
import { getAlertRoute } from './get';
import { getAlertStateRoute } from './get_alert_state';
import { getAlertInstanceSummaryRoute } from './get_alert_instance_summary';
import { listAlertTypesRoute } from './list_alert_types';
import { updateAlertRoute } from './update';
import { enableAlertRoute } from './enable';
import { disableAlertRoute } from './disable';
import { updateApiKeyRoute } from './update_api_key';
import { muteAlertInstanceRoute } from './mute_instance';
import { unmuteAlertInstanceRoute } from './unmute_instance';
import { muteAllAlertRoute } from './mute_all';
import { unmuteAllAlertRoute } from './unmute_all';
import { healthRoute } from './health';
import { RouteOptions } from '..';

export function defineLegacyRoutes(opts: RouteOptions) {
  const { router, licenseState, encryptedSavedObjects } = opts;

  createAlertRoute(opts);
  aggregateAlertRoute(router, licenseState);
  deleteAlertRoute(router, licenseState);
  findAlertRoute(router, licenseState);
  getAlertRoute(router, licenseState);
  getAlertStateRoute(router, licenseState);
  getAlertInstanceSummaryRoute(router, licenseState);
  listAlertTypesRoute(router, licenseState);
  updateAlertRoute(router, licenseState);
  enableAlertRoute(router, licenseState);
  disableAlertRoute(router, licenseState);
  updateApiKeyRoute(router, licenseState);
  muteAllAlertRoute(router, licenseState);
  unmuteAllAlertRoute(router, licenseState);
  muteAlertInstanceRoute(router, licenseState);
  unmuteAlertInstanceRoute(router, licenseState);
  healthRoute(router, licenseState, encryptedSavedObjects);
}
