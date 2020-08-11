/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Route } from 'react-router-dom';
import styled, { ThemeProvider, DefaultTheme } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { CoreStart, AppMountParameters } from '../../../../../src/core/public';
import { ApmPluginSetupDeps } from '../plugin';

import { useUiSetting$ } from '../../../../../src/plugins/kibana_react/public';
import { px, units } from '../style/variables';
import { UpdateBreadcrumbs } from '../components/app/Main/UpdateBreadcrumbs';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import { history, resetHistory } from '../utils/history';
import 'react-vis/dist/style.css';
import { RumHome } from '../components/app/RumDashboard/RumHome';
import { rumRoutes } from '../components/app/Main/route_config';
import { ApmAppRoot } from './index';
import { ConfigSchema } from '..';

const MainContainer = styled.div`
  padding: ${px(units.plus)};
  height: 100%;
`;

function RumApp() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ThemeProvider
      theme={(outerTheme?: DefaultTheme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      <MainContainer data-test-subj="apmMainContainer" role="main">
        <UpdateBreadcrumbs routes={rumRoutes} />
        <Route component={ScrollToTopOnPathChange} />
        <RumHome />
      </MainContainer>
    </ThemeProvider>
  );
}

/**
 * This module is rendered asynchronously in the Kibana platform.
 */
export const renderApp = (
  core: CoreStart,
  deps: ApmPluginSetupDeps,
  { element }: AppMountParameters,
  config: ConfigSchema
) => {
  resetHistory();
  ReactDOM.render(
    <ApmAppRoot
      core={core}
      deps={deps}
      routerHistory={history}
      config={config}
      app={<RumApp />}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
