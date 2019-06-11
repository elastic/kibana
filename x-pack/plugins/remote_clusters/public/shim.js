/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nContext } from 'ui/i18n';
import chrome from 'ui/chrome';
import { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } from 'ui/documentation_links';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { fatalError, toastNotifications } from 'ui/notify';
import routes from 'ui/routes';

import { trackUiMetric as track } from '../../../../src/legacy/core_plugins/ui_metric/public';

export function createShim() {
  return {
    core: {
      i18n: { Context: I18nContext },
      routing: {
        registerAngularRoute: (path, config) => {
          routes.when(path, config);
        },
      },
      chrome,
      notification: {
        fatalError,
        toastNotifications,
      },
      documentation: {
        esDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`,
      },
    },
    plugins: {
      management: {
        sections: management,
        constants: {
          BREADCRUMB: MANAGEMENT_BREADCRUMB,
        },
      },
      uiMetric: {
        track,
      },
    },
  };
}
