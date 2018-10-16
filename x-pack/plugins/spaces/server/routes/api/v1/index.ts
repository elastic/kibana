/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { initPrivateSpacesApi } from './spaces';

export function initPrivateApis(server: any) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);
  initPrivateSpacesApi(server, routePreCheckLicenseFn);
}
