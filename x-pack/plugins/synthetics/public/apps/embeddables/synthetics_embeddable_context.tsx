/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { Router } from 'react-router-dom';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, RedirectAppLinks } from '@kbn/kibana-react-plugin/public';
import { createMemoryHistory } from 'history';
import { EuiPanel } from '@elastic/eui';
import { SyntheticsEmbeddableStateContextProvider } from '../synthetics/contexts/synthetics_embeddable_context';
import { getSyntheticsAppProps } from '../synthetics/render_app';
import { storage, store } from '../synthetics/state';
import { SyntheticsSettingsContextProvider } from '../synthetics/contexts';
import { kibanaService } from '../../utils/kibana_service';

export const SyntheticsEmbeddableContext: React.FC<{ search: string }> = ({ search, children }) => {
  const props = getSyntheticsAppProps();

  const history = useRef(createMemoryHistory({ initialEntries: [`${search}`] }));

  return (
    <SyntheticsEmbeddableStateContextProvider>
      <EuiThemeProvider darkMode={props.darkMode}>
        <ReduxProvider store={store}>
          <Router history={history.current}>
            <SyntheticsSettingsContextProvider {...props}>
              <KibanaContextProvider
                services={{
                  ...kibanaService.coreStart,
                  storage,
                  data: kibanaService.startPlugins.data,
                  inspector: kibanaService.startPlugins.inspector,
                  triggersActionsUi: kibanaService.startPlugins.triggersActionsUi,
                  observability: kibanaService.startPlugins.observability,
                  cases: kibanaService.startPlugins.cases,
                }}
              >
                <RedirectAppLinks
                  className={APP_WRAPPER_CLASS}
                  application={kibanaService.coreStart.application}
                >
                  <EuiPanel hasShadow={false}>{children}</EuiPanel>
                </RedirectAppLinks>
              </KibanaContextProvider>
            </SyntheticsSettingsContextProvider>
          </Router>
        </ReduxProvider>
      </EuiThemeProvider>
    </SyntheticsEmbeddableStateContextProvider>
  );
};
