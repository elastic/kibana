/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'plugins/xpack_main/views/management/telemetry';
import routes from 'ui/routes';

import { management } from 'ui/management';

routes.defaults(/\/management/, {
  resolve: {
    telemetryManagementSection: function () {
      const kibanaManagementSection = management.getSection('kibana');

      if (kibanaManagementSection.hasItem('telemetry')) {
        kibanaManagementSection.deregister('telemetry');
      }

      kibanaManagementSection.register('telemetry', {
        order: 25,
        display: 'Telemetry',
        url: '#/management/kibana/telemetry'
      });
    }
  }
});
