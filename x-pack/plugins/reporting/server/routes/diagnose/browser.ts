/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../..';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { authorizedUserPreRoutingFactory } from '../lib/authorized_user_pre_routing';
import { LevelLogger as Logger } from '../../lib';

interface BrowserResponse {
  help: string[];
  success: boolean;
  logs: string;
}

export const registerDiagnoseBrowser = (reporting: ReportingCore, logger: Logger) => {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const { router } = setupDeps;

  router.post(
    {
      path: `${API_DIAGNOSE_URL}/browser`,
      // Currently no supported params, but keeping it open
      // in case the need/want arises
      validate: {},
    },
    userHandler(async (user, context, req, res) => {
      const { browserDriverFactory } = await reporting.getPluginStartDeps();
      const body: BrowserResponse = await browserDriverFactory.test(logger);

      return res.ok({ body });
    })
  );
};
