/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingCore } from '../..';
import { PUBLIC_ROUTES } from '../../../common/constants';
import { getCommonJobManagementRoutes } from '../common/jobs';

export function registerJobInfoRoutesPublic(reporting: ReportingCore) {
  const commonRoutes = getCommonJobManagementRoutes(reporting);
  commonRoutes.registerDownloadReport(PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX + '/{docId}');
  commonRoutes.registerDeleteReport(PUBLIC_ROUTES.JOBS.DELETE_PREFIX + '/{docId}');
}
