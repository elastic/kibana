/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, CoreTheme } from '@kbn/core/public';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import type { History } from 'history';
import React from 'react';
import type { Observable } from 'rxjs';
import { observabilityAIAssistantRouter } from './routes/config';
import type { ObservabilityAIAssistantAppService } from './service/create_app_service';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from './types';
import { SharedProviders } from './utils/shared_providers';

// This is the Conversation application.

export function Application({
  coreStart,
  history,
  pluginsStart,
  service,
  theme$,
}: {
  coreStart: CoreStart;
  history: History;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
  service: ObservabilityAIAssistantAppService;
  theme$: Observable<CoreTheme>;
}) {
  return (
    <SharedProviders
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      service={service}
      theme$={theme$}
    >
      <RouterProvider history={history} router={observabilityAIAssistantRouter as any}>
        <RouteRenderer />
      </RouterProvider>
    </SharedProviders>
  );
}
