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

/*
{ hashUrl:
   'http://localhost:5601/app/dashboards#/view/722b74f0-b882-11e8-a6d9-e546fe2bba5f?_g=(filters%3A!()%2CrefreshInterval%3A(pause%3A!f%2Cvalue%3A900000)%2Ctime%3A(from%3Anow-7d%2Cto%3Anow))&_a=(description%3A\'Analyze%20mock%20eCommerce%20orders%20and%20revenue\'%2Cfilters%3A!()%2CfullScreenMode%3A!f%2Coptions%3A(hidePanelTitles%3A!f%2CuseMargins%3A!t)%2Cquery%3A(language%3Akuery%2Cquery%3A\'\')%2CtimeRestore%3A!t%2Ctitle%3A\'%5BeCommerce%5D%20Revenue%20Dashboard\'%2CviewMode%3Aview)&forceNow=2020-08-11T21%3A04%3A22.664Z',
  tz: 'America/Los_Angeles',
  conditionalHeaders:
   { headers:
      { 'kbn-version': '8.0.0',
        'user-agent':
         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36',
        accept: '*\/*',
        origin: 'http://localhost:5601',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'accept-language': 'en-US,en;q=0.9',
        cookie:
        authorization: 'Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' },
     conditions:
      { hostname: 'localhost',
        port: 5601,
        basePath: '',
        protocol: 'http' } },
  layout: { id: 'png', dimensions: { width: 1440, height: 2024 } } }
*/
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

      const layout = {
        id: 'png',
        dimensions: {
          width: 1440,
          height: 2024,
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
