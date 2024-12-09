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
  const { router, licenseState, encryptedSavedObjects, usageCounter, isServerless, docLinks } =
    opts;

  createAlertRoute(opts);
  deleteAlertRoute(router, licenseState, docLinks, usageCounter, isServerless);
  findAlertRoute(router, licenseState, docLinks, usageCounter, isServerless);
  getAlertRoute(router, licenseState, docLinks, usageCounter, isServerless);
  getAlertStateRoute(router, licenseState, docLinks, usageCounter, isServerless);
  getAlertInstanceSummaryRoute(router, licenseState, docLinks, usageCounter, isServerless);
  listAlertTypesRoute(router, licenseState, docLinks, usageCounter, isServerless);
  updateAlertRoute(router, licenseState, docLinks, usageCounter, isServerless);
  enableAlertRoute(router, licenseState, docLinks, usageCounter, isServerless);
  disableAlertRoute(router, licenseState, docLinks, usageCounter, isServerless);
  updateApiKeyRoute(router, licenseState, docLinks, usageCounter, isServerless);
  muteAllAlertRoute(router, licenseState, docLinks, usageCounter, isServerless);
  unmuteAllAlertRoute(router, licenseState, docLinks, usageCounter, isServerless);
  muteAlertInstanceRoute(router, licenseState, docLinks, usageCounter, isServerless);
  unmuteAlertInstanceRoute(router, licenseState, docLinks, usageCounter, isServerless);
  healthRoute(router, licenseState, encryptedSavedObjects, docLinks, usageCounter, isServerless);
}
