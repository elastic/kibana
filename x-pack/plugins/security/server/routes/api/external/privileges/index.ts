/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { routePreCheckLicense } from '../../../../lib/route_pre_check_license';
import { initGetPrivilegesApi } from './get';

export function initPrivilegesApi(server: Record<string, any>) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  initGetPrivilegesApi(server, routePreCheckLicenseFn);
}
