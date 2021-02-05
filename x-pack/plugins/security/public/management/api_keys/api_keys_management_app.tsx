/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { StartServicesAccessor } from 'src/core/public';
import { RegisterManagementAppArgs } from '../../../../../../src/plugins/management/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { PluginStartDependencies } from '../../plugin';

interface CreateParams {
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const apiKeysManagementApp = Object.freeze({
  id: 'api_keys',
  create({ getStartServices }: CreateParams) {
    return {
      id: this.id,
      order: 30,
      title: i18n.translate('xpack.security.management.apiKeysTitle', {
        defaultMessage: 'API Keys',
      }),
      async mount({ element, setBreadcrumbs }) {
        setBreadcrumbs([
          {
            text: i18n.translate('xpack.security.apiKeys.breadcrumb', {
              defaultMessage: 'API Keys',
            }),
            href: `/`,
          },
        ]);

        const [[core], { APIKeysGridPage }, { APIKeysAPIClient }] = await Promise.all([
          getStartServices(),
          import('./api_keys_grid'),
          import('./api_keys_api_client'),
        ]);

        render(
          <KibanaContextProvider services={core}>
            <core.i18n.Context>
              <APIKeysGridPage
                notifications={core.notifications}
                apiKeysAPIClient={new APIKeysAPIClient(core.http)}
              />
            </core.i18n.Context>
          </KibanaContextProvider>,
          element
        );

        return () => {
          unmountComponentAtNode(element);
        };
      },
    } as RegisterManagementAppArgs;
  },
});
