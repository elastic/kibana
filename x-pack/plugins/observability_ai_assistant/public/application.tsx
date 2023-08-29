/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiErrorBoundary } from '@elastic/eui';
import type { CoreStart, CoreTheme } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import type { History } from 'history';
import React, { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { ObservabilityAIAssistantProvider } from './context/observability_ai_assistant_provider';
import { observabilityAIAssistantRouter } from './routes/config';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from './types';

export function Application({
  theme$,
  history,
  coreStart,
  pluginsStart,
  service,
}: {
  theme$: Observable<CoreTheme>;
  history: History;
  coreStart: CoreStart;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
  service: ObservabilityAIAssistantService;
}) {
  const theme = useMemo(() => {
    return { theme$ };
  }, [theme$]);
  return (
    <EuiErrorBoundary>
      <KibanaThemeProvider theme={theme}>
        <KibanaContextProvider
          services={{
            ...coreStart,
            ...pluginsStart,
          }}
        >
          <RedirectAppLinks coreStart={coreStart}>
            <coreStart.i18n.Context>
              <ObservabilityAIAssistantProvider value={service}>
                <RouterProvider history={history} router={observabilityAIAssistantRouter as any}>
                  <RouteRenderer />
                </RouterProvider>
              </ObservabilityAIAssistantProvider>
            </coreStart.i18n.Context>
          </RedirectAppLinks>
        </KibanaContextProvider>
      </KibanaThemeProvider>
    </EuiErrorBoundary>
  );
}
