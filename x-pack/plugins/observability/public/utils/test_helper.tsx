/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render as testLibRender } from '@testing-library/react';
import { AppMountParameters } from 'kibana/public';
import { coreMock } from 'src/core/public/mocks';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  KibanaContextProvider,
  KibanaPageTemplate,
} from '../../../../../src/plugins/kibana_react/public';
import translations from '../../../translations/translations/ja-JP.json';
import { PluginContext } from '../context/plugin_context';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { createObservabilityRuleTypeRegistryMock } from '../rules/observability_rule_type_registry_mock';

const appMountParameters = { setHeaderActionMenu: () => {} } as unknown as AppMountParameters;

export const core = coreMock.createStart();
export const data = dataPluginMock.createStartContract();

const config = {
  unsafe: {
    alertingExperience: { enabled: true },
    cases: { enabled: true },
    overviewNext: { enabled: false },
    rules: { enabled: false },
  },
};

const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistryMock();

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
