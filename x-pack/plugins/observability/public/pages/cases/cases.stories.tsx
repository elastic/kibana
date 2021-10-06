/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from '../../../../../../src/core/public';
import {
  createKibanaReactContext,
  KibanaPageTemplate,
} from '../../../../../../src/plugins/kibana_react/public';
import { casesFeatureId } from '../../../common';
import { PluginContext, PluginContextValue } from '../../context/plugin_context';
import { AllCasesPage } from './all_cases';

export default {
  title: 'app/Cases',
  component: AllCasesPage,
  decorators: [
    (Story: ComponentType) => {
      const KibanaReactContext = createKibanaReactContext({
        application: {
          capabilities: { [casesFeatureId]: { read_cases: true } },
          getUrlForApp: () => '',
        },
        cases: { getAllCases: () => <></> },
        chrome: { docTitle: { change: () => {} }, setBadge: () => {} },
        docLinks: {
          DOC_LINK_VERSION: '0',
          ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
        },
        uiSettings: { get: () => true },
      } as unknown as Partial<CoreStart>);

      const pluginContextValue = {
        ObservabilityPageTemplate: KibanaPageTemplate,
      } as unknown as PluginContextValue;

      return (
        <MemoryRouter>
          <KibanaReactContext.Provider>
            <PluginContext.Provider value={pluginContextValue}>
              <Story />
            </PluginContext.Provider>
          </KibanaReactContext.Provider>
        </MemoryRouter>
      );
    },
  ],
};

export function EmptyState() {
  return <AllCasesPage />;
}
