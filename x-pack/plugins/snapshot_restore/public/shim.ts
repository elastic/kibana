/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { I18nContext } from 'ui/i18n';

import chrome from 'ui/chrome';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { fatalError } from 'ui/notify';
import routes from 'ui/routes';

import { unmountComponentAtNode } from 'react-dom';
import { HashRouter } from 'react-router-dom';

export function createShim() {
  // This is an Angular service, which is why we use this provider pattern
  // to access it within our React app.
  let httpClient;

  // The deffered AngularJS api allows us to create deferred promise
  // to be resolved later. This allows us to cancel in flight Http Requests
  // https://docs.angularjs.org/api/ng/service/$q#the-deferred-api
  let $q;

  let reactRouter;

  return {
    core: {
      i18n: {
        ...i18n,
        Context: I18nContext,
        FormattedMessage,
      },
      routing: {
        registerAngularRoute: (path: string, config: object): void => {
          routes.when(path, config);
        },
        unmountReactApp: (elem: Element | undefined): void => {
          if (elem) {
            unmountComponentAtNode(elem);
          }
        },
        registerRouter: (router: HashRouter): void => {
          reactRouter = router;
        },
        getRouter: (): HashRouter => {
          return reactRouter;
        },
      },
      http: {
        setClient: (client: any, $deferred: any): void => {
          httpClient = client;
          $q = $deferred;
        },
        getClient: (): any => httpClient,
      },
      chrome,
      notification: {
        fatalError,
      },
    },
    plugins: {
      management: {
        sections: management,
        constants: {
          BREADCRUMB: MANAGEMENT_BREADCRUMB,
        },
      },
    },
  };
}
