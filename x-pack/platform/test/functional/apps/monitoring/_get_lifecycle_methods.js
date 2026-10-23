/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const DISPLAY_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

export const getLifecycleMethods = (getService, getPageObjects) => {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const client = getService('es');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['monitoring', 'security', 'common']);
  let _archive;

  const deleteDataStream = async (index) => {
    await client.transport.request(
      {
        method: 'DELETE',
        path: `_data_stream/${index}`,
      },
      {
        ignore: [404],
      }
    );
  };

  return {
    async setup(archive, { from, to, useSuperUser = false, useCreate = false }) {
      _archive = archive;
      if (!useSuperUser) {
        await security.testUser.setRoles([
          'monitoring_user',
          'kibana_admin',
          'test_monitoring',
          'test_filebeat_reader',
        ]);
      }

      const browser = getService('browser');

      // provide extra height for the page and avoid clusters sending telemetry during tests
      await browser.setWindowSize(1600, 1000);

      await esArchiver.load(archive, { useCreate });
      // seeded before the first render: with the default now-15m range the app finds no clusters and
      // remounts through /no-data, and autorefresh would tick after the archive data is wiped out
      await kibanaServer.uiSettings.replace({
        'timepicker:timeDefaults': JSON.stringify({
          from: moment.utc(from, DISPLAY_DATE_FORMAT).toISOString(),
          to: moment.utc(to, DISPLAY_DATE_FORMAT).toISOString(),
        }),
        'timepicker:refreshIntervalDefaults': JSON.stringify({ pause: true, value: 10000 }),
      });

      await PageObjects.common.navigateToApp('monitoring');
    },

    async tearDown() {
      await deleteDataStream('.monitoring-*-8-*');
      // the seeded range is global and outlives this suite: enable_monitoring.js follows and needs
      // the default now-15m range to see the live data it turns collection on for
      await kibanaServer.uiSettings.replace({});
      await security.testUser.restoreDefaults();
      return esArchiver.unload(_archive);
    },
  };
};
