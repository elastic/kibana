/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteOptions } from '..';
import { aggregateAlertRoute } from './aggregate';
import { createAlertRoute } from './create';
import { deleteAlertRoute } from './delete';
import { disableAlertRoute } from './disable';
import { enableAlertRoute } from './enable';
import { findAlertRoute } from './find';
import { getAlertRoute } from './get';
import { getAlertInstanceSummaryRoute } from './get_alert_instance_summary';
import { getAlertStateRoute } from './get_alert_state';
import { healthRoute } from './health';
import { listAlertTypesRoute } from './list_alert_types';
import { muteAllAlertRoute } from './mute_all';
import { muteAlertInstanceRoute } from './mute_instance';
import { unmuteAllAlertRoute } from './unmute_all';
import { unmuteAlertInstanceRoute } from './unmute_instance';
import { updateAlertRoute } from './update';
import { updateApiKeyRoute } from './update_api_key';

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
