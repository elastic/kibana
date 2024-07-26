/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { Provider as ReduxProvider } from 'react-redux';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { SyntheticsRefreshContextProvider } from './synthetics_refresh_context';
import { SyntheticsDataViewContextProvider } from './synthetics_data_view_context';
import { SyntheticsAppProps } from './synthetics_settings_context';
import { storage, store } from '../state';

export const SyntheticsSharedContext: React.FC<SyntheticsAppProps> = ({
  coreStart,
  setupPlugins,
  startPlugins,
  children,
  darkMode,
}) => {
  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        ...setupPlugins,
        storage,
        data: startPlugins.data,
        inspector: startPlugins.inspector,
        triggersActionsUi: startPlugins.triggersActionsUi,
        observability: startPlugins.observability,
        observabilityShared: startPlugins.observabilityShared,
        observabilityAIAssistant: startPlugins.observabilityAIAssistant,
        exploratoryView: startPlugins.exploratoryView,
        cases: startPlugins.cases,
        spaces: startPlugins.spaces,
        fleet: startPlugins.fleet,
        share: startPlugins.share,
        unifiedSearch: startPlugins.unifiedSearch,
        embeddable: startPlugins.embeddable,
        slo: startPlugins.slo,
      }}
    >
      <EuiThemeProvider darkMode={darkMode}>
        <ReduxProvider store={store}>
          <SyntheticsRefreshContextProvider>
            <SyntheticsDataViewContextProvider dataViews={startPlugins.dataViews}>
              <RedirectAppLinks
                coreStart={{
                  application: coreStart.application,
                }}
              >
                {children}
              </RedirectAppLinks>
            </SyntheticsDataViewContextProvider>
          </SyntheticsRefreshContextProvider>
        </ReduxProvider>
      </EuiThemeProvider>
    </KibanaContextProvider>
  );
};
