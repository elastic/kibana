/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { of } from 'rxjs';
import type { DecoratorFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { createMemoryHistory } from 'history';

import { I18nProvider } from '@kbn/i18n/react';

import { ScopedHistory } from '../../../../src/core/public';
import { IntegrationsAppContext } from '../public/applications/integrations/app';
import type { FleetConfigType, FleetStartServices } from '../public/plugin';

// TODO: clintandrewhall - this is not ideal, or complete.  The root context of Fleet applications
// requires full start contracts of its dependencies.  As a result, we have to mock all of those contracts
// with Storybook equivalents.  This is a temporary solution, and should be replaced with a more complete
// mock later, (or, ideally, Fleet starts to use a service abstraction).
//
// Expect this to grow as components that are given Stories need access to mocked services.
export const contextDecorator: DecoratorFn = (story: Function) => {
  const basepath = '/';
  const memoryHistory = createMemoryHistory({ initialEntries: [basepath] });
  const history = new ScopedHistory(memoryHistory, basepath);

  const startServices = ({
    application: {
      currentAppId$: of('home'),
      navigateToUrl: (url: string) => action(`Navigate to: ${url}`),
      getUrlForApp: (url: string) => url,
    },
    http: {
      basePath: {
        prepend: () => basepath,
      },
    },
    notifications: {},
    history,
    uiSettings: {
      get$: (key: string) => {
        switch (key) {
          case 'theme:darkMode':
            return of(false);
          default:
            return of();
        }
      },
    },
    i18n: {
      Context: I18nProvider,
    },
  } as unknown) as FleetStartServices;

  const config = ({
    enabled: true,
    agents: {
      enabled: true,
      elasticsearch: {},
    },
  } as unknown) as FleetConfigType;

  const extensions = {};

  const kibanaVersion = '1.2.3';

  return (
    <IntegrationsAppContext
      {...{ kibanaVersion, basepath, config, history, startServices, extensions }}
    >
      {story()}
    </IntegrationsAppContext>
  );
};
