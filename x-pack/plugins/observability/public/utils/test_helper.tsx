/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render as testLibRender } from '@testing-library/react';
import { AppMountParameters, CoreStart } from 'kibana/public';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { of } from 'rxjs';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import translations from '../../../translations/translations/ja-JP.json';
import { PluginContext } from '../context/plugin_context';
import { ObservabilityPluginSetupDeps } from '../plugin';
import { EuiThemeProvider } from '../typings';

const appMountParameters = ({ setHeaderActionMenu: () => {} } as unknown) as AppMountParameters;

export const core = ({
  http: {
    basePath: {
      prepend: jest.fn(),
    },
  },
  uiSettings: {
    get: (key: string) => true,
    get$: (key: string) => of(true),
  },
} as unknown) as CoreStart;

const plugins = ({
  data: { query: { timefilter: { timefilter: { setTime: jest.fn() } } } },
} as unknown) as ObservabilityPluginSetupDeps;

export const render = (component: React.ReactNode) => {
  return testLibRender(
    <IntlProvider locale="en-US" messages={translations.messages}>
      <KibanaContextProvider services={{ ...core }}>
        <PluginContext.Provider value={{ appMountParameters, core, plugins }}>
          <EuiThemeProvider>{component}</EuiThemeProvider>
        </PluginContext.Provider>
      </KibanaContextProvider>
    </IntlProvider>
  );
};
