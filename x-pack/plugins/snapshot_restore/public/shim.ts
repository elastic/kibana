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

export interface AppCore {
  i18n: {
    [i18nPackage: string]: any;
    Context: typeof I18nContext;
    FormattedMessage: typeof FormattedMessage;
  };
  chrome: typeof chrome;
  notification: {
    fatalError: typeof fatalError;
  };
}

export interface AppPlugins {
  management: {
    sections: typeof management;
    constants: {
      BREADCRUMB: typeof MANAGEMENT_BREADCRUMB;
    };
  };
}

export interface Core extends AppCore {
  routing: {
    registerAngularRoute(path: string, config: object): void;
    unmountReactApp(elem: Element | undefined | null): void;
    registerRouter(router: HashRouter): void;
    getRouter(): HashRouter | undefined;
  };
  http: {
    setClient(client: any, $deferred: any): void;
    getClient(): any;
  };
}

export interface Plugins extends AppPlugins {} // tslint:disable-line no-empty-interface

export function createShim(): { core: Core; plugins: Plugins } {
  // This is an Angular service, which is why we use this provider pattern
  // to access it within our React app.
  let httpClient: any;

  // The deffered AngularJS api allows us to create deferred promise
  // to be resolved later. This allows us to cancel in flight Http Requests
  // https://docs.angularjs.org/api/ng/service/$q#the-deferred-api
  let $q: any;

  let reactRouter: HashRouter | undefined;

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
        unmountReactApp: (elem: Element | undefined | null): void => {
          if (elem) {
            unmountComponentAtNode(elem);
          }
        },
        registerRouter: (router: HashRouter): void => {
          reactRouter = router;
        },
        getRouter: (): HashRouter | undefined => {
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
