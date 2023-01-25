/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useCurrentRoute,
  useMatchRoutes,
  RouteMatch,
  Route,
} from '@kbn/typed-react-router-config';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';
import React from 'react';
import { EuiErrorBoundary } from '@elastic/eui';
import { ApmMainTemplate } from './templates/apm_main_template';

function getErrorMessage(routes: Array<RouteMatch<Route>>) {
  return routes.reverse().find((route) => route.errorMessage)?.errorMessage;
}

export function Router({ children }: { children: React.ReactChild }) {
  const currentRoute = useCurrentRoute();
  const routes = useMatchRoutes();

  if (currentRoute.hasExactMatch) {
    const errorMessage = getErrorMessage(routes);
    if (errorMessage) {
      return (
        <ApmMainTemplate pageTitle="APM">
          <EuiErrorBoundary>
            <RenderError errorMessage={errorMessage} />
          </EuiErrorBoundary>
        </ApmMainTemplate>
      );
    }
    return <>{children}</>;
  }

  return (
    <ApmMainTemplate pageTitle="APM">
      <NotFoundPrompt />
    </ApmMainTemplate>
  );
}

function RenderError({ errorMessage }: { errorMessage: string }) {
  throw new Error(errorMessage);
  return <div />;
}
