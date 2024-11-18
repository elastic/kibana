/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  const { router, licenseState, encryptedSavedObjects, usageCounter, isServerless } = opts;

  createAlertRoute(opts);
  deleteAlertRoute(router, licenseState, usageCounter, isServerless);
  findAlertRoute(router, licenseState, usageCounter, isServerless);
  getAlertRoute(router, licenseState, usageCounter, isServerless);
  getAlertStateRoute(router, licenseState, usageCounter, isServerless);
  getAlertInstanceSummaryRoute(router, licenseState, usageCounter, isServerless);
  listAlertTypesRoute(router, licenseState, usageCounter, isServerless);
  updateAlertRoute(router, licenseState, usageCounter, isServerless);
  enableAlertRoute(router, licenseState, usageCounter, isServerless);
  disableAlertRoute(router, licenseState, usageCounter, isServerless);
  updateApiKeyRoute(router, licenseState, usageCounter, isServerless);
  muteAllAlertRoute(router, licenseState, usageCounter, isServerless);
  unmuteAllAlertRoute(router, licenseState, usageCounter, isServerless);
  muteAlertInstanceRoute(router, licenseState, usageCounter, isServerless);
  unmuteAlertInstanceRoute(router, licenseState, usageCounter, isServerless);
  healthRoute(router, licenseState, encryptedSavedObjects, usageCounter, isServerless);
}
