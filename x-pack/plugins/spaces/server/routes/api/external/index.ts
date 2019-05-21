/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { initDeleteSpacesApi } from './delete';
import { initGetSpacesApi } from './get';
import { initPostSpacesApi } from './post';
import { initPutSpacesApi } from './put';

export function initExternalSpacesApi(server: any) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  initDeleteSpacesApi(server, routePreCheckLicenseFn);
  initGetSpacesApi(server, routePreCheckLicenseFn);
  initPostSpacesApi(server, routePreCheckLicenseFn);
  initPutSpacesApi(server, routePreCheckLicenseFn);
}
