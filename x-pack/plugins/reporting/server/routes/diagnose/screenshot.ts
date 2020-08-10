/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../..';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { authorizedUserPreRoutingFactory } from '../lib/authorized_user_pre_routing';
import { LevelLogger as Logger } from '../../lib';
import { generatePngObservableFactory } from '../../export_types/png/lib/generate_png';

interface ScreenShotResponse {
  help: string[];
  success: boolean;
  logs: string;
}

const successResponse: ScreenShotResponse = {
  success: true,
  help: [],
  logs: '',
};

export const registerDiagnoseBrowser = (reporting: ReportingCore, logger: Logger) => {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const { router } = setupDeps;

  router.post(
    {
      path: `${API_DIAGNOSE_URL}/screenshot`,
      // Currently no supported params, but keeping it open
      // in case the need/want arises
      validate: {},
    },
    userHandler(async (user, context, req, res) => {
      const generatePngObservable = await generatePngObservableFactory(reporting);

      return generatePngObservable(logger, hashUrl, 'UTC-8', {}, job.layout)
        .pipe()
        .toPromise()
        .then(() => res.ok({ body: successResponse }))
        .catch((error) =>
          res.ok({
            body: {
              success: false,
              help: [`We couldn't screenshot your Kibana install.`],
              logs: `${error.message}\n${error.stack}`,
            },
          })
        );
    })
  );
};
