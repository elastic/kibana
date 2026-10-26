/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWatcher, deleteWatcher, putWatcher } from './util';

export default ({ getService, getPageObjects }) => {
  describe('watcher app', () => {
    const config = getService('config');
    const servers = config.get('servers');
    const retry = getService('retry');
    const log = getService('log');
    const client = getService('es');

    const KIBANAIP = process.env.KIBANAIP;
    const VERSION_NUMBER = process.env.VERSION_NUMBER;
    const VM = process.env.VM;
    const VERSION_BUILD_HASH = process.env.VERSION_BUILD_HASH;
    const STARTEDBY = process.env.STARTEDBY;
    const REPORTING_TEST_EMAILS = process.env.REPORTING_TEST_EMAILS;

    const PageObjects = getPageObjects(['common']);
    describe('PNG Reporting watch', () => {
      let id = 'watcher_png_report-';
      id = id + new Date().getTime(); // For debugging.
      // http://localhost:5601/api/reporting/generate/pngV2?jobParams=%28browserTimezone%3AAmerica%2FNew_York%2Clayout%3A%28dimensions%3A%28height%3A2024%2Cwidth%3A1920%29%2Cid%3Apreserve_layout%29%2ClocatorParams%3A%28id%3ADASHBOARD_APP_LOCATOR%2Cparams%3A%28dashboardId%3A%27722b74f0-b882-11e8-a6d9-e546fe2bba5f%27%2CpreserveSavedFilters%3A%21t%2CtimeRange%3A%28from%3Anow-7d%2Cto%3Anow%29%2CuseHash%3A%21f%2CviewMode%3Aview%29%29%2CobjectType%3Adashboard%2Ctitle%3A%27%5BeCommerce%5D%20Revenue%20Dashboard%27%2Cversion%3A%278.6.0-SNAPSHOT%27%29
      const watch = { id };
      const reportingUrl =
        servers.kibana.protocol +
        '://' +
        KIBANAIP +
        ':' +
        servers.kibana.port +
        '/api/reporting/generate/pngV2?jobParams=%28browserTimezone%3AAmerica%2FNew_York%2Clayout%3A%28dimensions%3A%28height%3A2024%2Cwidth%3A1920%29%2Cid%3Apreserve_layout%29%2ClocatorParams%3A%28id%3ADASHBOARD_APP_LOCATOR%2Cparams%3A%28dashboardId%3A%27722b74f0-b882-11e8-a6d9-e546fe2bba5f%27%2CpreserveSavedFilters%3A%21t%2CtimeRange%3A%28from%3Anow-7d%2Cto%3Anow%29%2CuseHash%3A%21f%2CviewMode%3Aview%29%29%2CobjectType%3Adashboard%2Ctitle%3A%27%5BeCommerce%5D%20Revenue%20Dashboard%27%2Cversion%3A%278.6.0-SNAPSHOT%27%29';
      const emails = REPORTING_TEST_EMAILS.split(',');
      const interval = 10;
      const body = {
        trigger: {
          schedule: {
            interval: `${interval}s`,
          },
        },
        throttle_period: '15m',
        actions: {
          email_admin: {
            email: {
              to: emails,
              subject:
                'PNG ' +
                VERSION_NUMBER +
                ' ' +
                id +
                ', VM=' +
                VM +
                ' ' +
                VERSION_BUILD_HASH +
                ' by:' +
                STARTEDBY,
              attachments: {
                'test_report.png': {
                  reporting: {
                    url: reportingUrl,
                    auth: {
                      basic: {
                        username: servers.elasticsearch.username,
                        password: servers.elasticsearch.password,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      it('should successfully add a new watch for PNG Reporting', async () => {
        await putWatcher(watch, id, body, client, log);
      });

      it('should be successful and increment revision', async () => {
        await getWatcher(watch, id, client, log, PageObjects.common, retry.tryForTime.bind(retry));
      });
      it('should delete watch and update revision', async () => {
        await deleteWatcher(watch, id, client, log);
      });
    });
  });
};
