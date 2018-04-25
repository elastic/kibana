/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'plugins/spaces/views/management/page_routes';
import routes from 'ui/routes';

import { management } from 'ui/management';

routes.defaults(/\/management/, {
  resolve: {
    spacesManagementSection: function () {

      function deregisterSpaces() {
        management.deregister('spaces');
      }

      function ensureSpagesRegistered() {
        const registerSpaces = () => management.register('spaces', {
          display: 'Spaces',
          order: 10
        });
        const getSpaces = () => management.getSection('spaces');

        const spaces = (management.hasItem('spaces')) ? getSpaces() : registerSpaces();

        if (!spaces.hasItem('manage_spaces')) {
          spaces.register('manage_spaces', {
            name: 'spacesManagementLink',
            order: 10,
            display: 'Spaces Management',
            url: `#/management/spaces/list`,
          });
        }
      }

      deregisterSpaces();

      ensureSpagesRegistered();
    }
  }
});
