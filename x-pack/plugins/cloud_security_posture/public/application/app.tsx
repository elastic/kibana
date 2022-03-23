/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import { I18nProvider } from '@kbn/i18n-react';
import { Router, Redirect, Switch, Route } from 'react-router-dom';
import type { RouteProps } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { EuiErrorBoundary } from '@elastic/eui';
import { Theme, ThemeProvider } from '@emotion/react';
import { allNavigationItems } from '../common/navigation/constants';
import { CspNavigationItem } from '../common/navigation/types';
import { UnknownRoute } from '../components/unknown_route';
import {
  KibanaContextProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '../../../../../src/plugins/kibana_react/public';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '../../../../../src/core/public';
import type { CspClientPluginStartDeps } from '../types';
import { pageToComponentMapping } from './constants';

const queryClient = new QueryClient();

export interface CspAppDeps {
  core: CoreStart;
  deps: CspClientPluginStartDeps;
  params: AppMountParameters;
}

type RoutePropsWithStringPath = RouteProps & { path: string };

// Converts the mapping of page -> component to be of type `RouteProps` while filtering out disabled navigation items
export const getRoutesFromMapping = <T extends string>(
  navigationItems: Record<T, CspNavigationItem>,
  componentMapping: Record<T, RouteProps['component']>
): readonly RoutePropsWithStringPath[] =>
  Object.entries(componentMapping)
    .filter(([id, _]) => !navigationItems[id as T].disabled)
    .map<RoutePropsWithStringPath>(([id, component]) => ({
      ...navigationItems[id as T],
      component: component as RouteProps['component'],
    }));

const routes = getRoutesFromMapping(allNavigationItems, pageToComponentMapping);

export const CspApp = ({ core, deps, params }: CspAppDeps) => (
  <RedirectAppLinks application={core.application} className={APP_WRAPPER_CLASS}>
    <KibanaContextProvider services={{ ...deps, ...core }}>
      <QueryClientProvider client={queryClient}>
        <EuiErrorBoundary>
          <Router history={params.history}>
            <CspThemeProvider>
              <I18nProvider>
                <Switch>
                  {routes.map((route) => (
                    <Route key={route.path} {...route} />
                  ))}
                  <Route exact path="/" component={RedirectToDashboard} />
                  <Route path="*" component={UnknownRoute} />
                </Switch>
              </I18nProvider>
            </CspThemeProvider>
          </Router>
        </EuiErrorBoundary>
      </QueryClientProvider>
    </KibanaContextProvider>
  </RedirectAppLinks>
);

const RedirectToDashboard = () => <Redirect to={allNavigationItems.dashboard.path} />;

function CspThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ThemeProvider
      theme={(outerTheme?: Theme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      {children}
    </ThemeProvider>
  );
}
