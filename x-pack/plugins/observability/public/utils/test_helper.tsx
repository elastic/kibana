/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render as testLibRender } from '@testing-library/react';
import { AppMountParameters } from '@kbn/core/public';

import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import translations from '@kbn/translations-plugin/translations/ja-JP.json';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { PluginContext } from '../context/plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '../rules/observability_rule_type_registry_mock';
import { ConfigSchema } from '../plugin';

const appMountParameters = { setHeaderActionMenu: () => {} } as unknown as AppMountParameters;

export const core = coreMock.createStart();
export const data = dataPluginMock.createStartContract();

const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistryMock();

const config = {
  unsafe: {
    alertDetails: { enabled: false },
  },
} as ConfigSchema;

export const render = (component: React.ReactNode) => {
  return testLibRender(
    <IntlProvider locale="en-US" messages={translations.messages}>
      <KibanaContextProvider services={{ ...core, data }}>
        <PluginContext.Provider
          value={{
            appMountParameters,
            config,
            observabilityRuleTypeRegistry,
            ObservabilityPageTemplate: KibanaPageTemplate,
          }}
        >
          <EuiThemeProvider>{component}</EuiThemeProvider>
        </PluginContext.Provider>
      </KibanaContextProvider>
    </IntlProvider>
  );
};
