/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'plugins/spaces/views/management/page_routes';
// @ts-ignore
import { management } from 'ui/management';
// @ts-ignore
import routes from 'ui/routes';

const MANAGE_SPACES_KEY = 'manage_spaces';

routes.defaults(/\/management/, {
  resolve: {
    spacesManagementSection() {
      function getKibanaSection() {
        return management.getSection('kibana');
      }

      function deregisterSpaces() {
        getKibanaSection().deregister(MANAGE_SPACES_KEY);
      }

      function ensureSpagesRegistered() {
        const kibanaSection = getKibanaSection();

        if (!kibanaSection.hasItem(MANAGE_SPACES_KEY)) {
          kibanaSection.register(MANAGE_SPACES_KEY, {
            name: 'spacesManagementLink',
            order: 10,
            display: 'Spaces',
            url: `#/management/spaces/list`,
          });
        }
      }

      deregisterSpaces();

      ensureSpagesRegistered();
    },
  },
});
