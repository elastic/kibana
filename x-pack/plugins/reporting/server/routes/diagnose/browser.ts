/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../..';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { browserTest } from '../../browsers/chromium/driver_factory/test';
import { LevelLogger as Logger } from '../../lib';
import { DiagnosticResponse } from '../../types';
import { authorizedUserPreRoutingFactory } from '../lib/authorized_user_pre_routing';

export const registerDiagnoseBrowser = (reporting: ReportingCore, logger: Logger) => {
  const { router } = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);

  router.post(
    {
      path: `${API_DIAGNOSE_URL}/browser`,
      validate: {},
    },
    userHandler(async (user, context, req, res) => {
      const body: DiagnosticResponse = await browserTest(reporting, logger);

      return res.ok({ body });
    })
  );
};
