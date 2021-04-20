/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render as testLibRender } from '@testing-library/react';
import { AppMountParameters, CoreStart } from 'kibana/public';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { of } from 'rxjs';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import translations from '../../../translations/translations/ja-JP.json';
import { PluginContext } from '../context/plugin_context';
import { ObservabilityPublicPluginsStart } from '../plugin';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';
import { createObservabilityRuleRegistryMock } from '../rules/observability_rule_registry_mock';

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

const config = { unsafe: { alertingExperience: { enabled: true } } };

const plugins = ({
  data: { query: { timefilter: { timefilter: { setTime: jest.fn() } } } },
} as unknown) as ObservabilityPublicPluginsStart;

const observabilityRuleRegistry = createObservabilityRuleRegistryMock();

export const render = (component: React.ReactNode) => {
  return testLibRender(
    <IntlProvider locale="en-US" messages={translations.messages}>
      <KibanaContextProvider services={{ ...core }}>
        <PluginContext.Provider
          value={{ appMountParameters, config, core, plugins, observabilityRuleRegistry }}
        >
          <EuiThemeProvider>{component}</EuiThemeProvider>
        </PluginContext.Provider>
      </KibanaContextProvider>
    </IntlProvider>
  );
};
