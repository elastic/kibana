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
import { getAbsoluteUrlFactory } from '../../export_types/common/get_absolute_url';
import { omitBlacklistedHeaders } from '../../export_types/common';

interface ScreenShotResponse {
  help: string[];
  success: boolean;
  logs: string;
}

export const registerDiagnoseScreenshot = (reporting: ReportingCore, logger: Logger) => {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const { router } = setupDeps;

  const successResponse: ScreenShotResponse = {
    success: true,
    help: [],
    logs: '',
  };

  router.post(
    {
      path: `${API_DIAGNOSE_URL}/screenshot`,
      // Currently no supported params, but keeping it open
      // in case the need/want arises
      validate: {},
    },
    userHandler(async (user, context, req, res) => {
      const generatePngObservable = await generatePngObservableFactory(reporting);
      const config = reporting.getConfig();
      const decryptedHeaders = req.headers as Record<string, string>;
      const [basePath, protocol, hostname, port] = [
        config.kbnConfig.get('server', 'basePath'),
        config.get('kibanaServer', 'protocol'),
        config.get('kibanaServer', 'hostname'),
        config.get('kibanaServer', 'port'),
      ] as string[];

      const getAbsoluteUrl = getAbsoluteUrlFactory({
        defaultBasePath: basePath,
        protocol,
        hostname,
        port,
      });

      const hashUrl = getAbsoluteUrl({
        basePath,
        path: '/',
        hash: '',
        search: '',
      });

      // Hack the layout to make the base/login page work
      const layout = {
        id: 'png',
        dimensions: {
          width: 1440,
          height: 2024,
        },
        selectors: {
          screenshot: '.application',
          renderComplete: '.application',
          itemsCountAttribute: 'data-test-subj="kibanaChrome"',
          timefilterDurationAttribute: 'data-test-subj="kibanaChrome"',
        },
      };

      const headers = {
        headers: omitBlacklistedHeaders({
          job: null,
          decryptedHeaders,
        }),
        conditions: {
          hostname,
          port: +port,
          basePath,
          protocol,
        },
      };

      return generatePngObservable(logger, hashUrl, 'America/Los_Angeles', headers, layout)
        .pipe()
        .toPromise()
        .then((screenshot) => {
          if (screenshot.warnings.length) {
            return res.ok({
              body: {
                success: false,
                help: [],
                logs: screenshot.warnings,
              },
            });
          }
          return res.ok({ body: successResponse });
        })
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
