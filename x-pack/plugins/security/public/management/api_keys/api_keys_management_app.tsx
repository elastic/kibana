/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from 'src/core/public';
import { RegisterManagementAppArgs } from '../../../../../../src/plugins/management/public';
import { PluginStartDependencies } from '../../plugin';
import { APIKeysGridPage } from './api_keys_grid';
import { APIKeysAPIClient } from './api_keys_api_client';
import { DocumentationLinksService } from './documentation_links';

interface CreateParams {
  getStartServices: CoreSetup<PluginStartDependencies>['getStartServices'];
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
      async mount({ basePath, element, setBreadcrumbs }) {
        const [{ docLinks, http, notifications, i18n: i18nStart }] = await getStartServices();
        setBreadcrumbs([
          {
            text: i18n.translate('xpack.security.apiKeys.breadcrumb', {
              defaultMessage: 'API Keys',
            }),
            href: `#${basePath}`,
          },
        ]);

        render(
          <i18nStart.Context>
            <APIKeysGridPage
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
