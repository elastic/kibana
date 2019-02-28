/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { unmountComponentAtNode } from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { management } from 'ui/management';
import routes from 'ui/routes';

export function createShim() {
  // This is an Angular service, which is why we use this provider pattern
  // to access it within our React app.
  let httpClient;

  // The deffered AngularJS api allows us to create deferred promise
  // to be resolved later. This allows us to cancel in flight Http Requests
  // https://docs.angularjs.org/api/ng/service/$q#the-deferred-api
  let $q;

  return {
    core: {
      i18n: {
        ...i18n,
        Context: I18nContext,
      },
      routes: {
        when: routes.when,
        unmountReactApp: (elem: Element | undefined): void => {
          if (elem) {
            unmountComponentAtNode(elem);
          }
        },
      },
      http: {
        setClient: (client: any, $deferred: any): void => {
          httpClient = client;
          $q = $deferred;
        },
        getClient: (): any => httpClient,
      },
    },
    plugins: {
      management,
    },
  };
}
