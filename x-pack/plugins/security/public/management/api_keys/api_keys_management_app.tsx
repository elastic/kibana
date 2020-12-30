/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { StartServicesAccessor } from 'src/core/public';
import { RegisterManagementAppArgs } from '../../../../../../src/plugins/management/public';
import { PluginStartDependencies } from '../../plugin';
import { DocumentationLinksService } from './documentation_links';

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

        const [
          [{ docLinks, http, notifications, i18n: i18nStart, application }],
          { APIKeysGridPage },
          { APIKeysAPIClient },
        ] = await Promise.all([
          getStartServices(),
          import('./api_keys_grid'),
          import('./api_keys_api_client'),
        ]);

        render(
          <i18nStart.Context>
            <APIKeysGridPage
              navigateToApp={application.navigateToApp}
              notifications={notifications}
              docLinks={new DocumentationLinksService(docLinks)}
              apiKeysAPIClient={new APIKeysAPIClient(http)}
            />
          </i18nStart.Context>,
          element
        );

        return () => {
          unmountComponentAtNode(element);
        };
      },
    } as RegisterManagementAppArgs;
  },
});
