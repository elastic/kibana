/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'unstated';
import { BASE_PATH } from '../common/constants';
import { BreadcrumbProvider } from './components/route_with_breadcrumb';
import { BeatsContainer } from './containers/beats';
import { TagsContainer } from './containers/tags';
import { compose } from './lib/compose/kibana';
import { FrontendLibs } from './lib/types';
import { AppRouter } from './router';

async function startApp(libs: FrontendLibs) {
  await libs.framework.renderUIAtPath(
    '/management/beats_management',
    <ThemeProvider theme={{ eui: euiVars }}>
      <Provider inject={[new BeatsContainer(libs), new TagsContainer(libs)]}>
        <BreadcrumbProvider>
          <AppRouter libs={libs} />
        </BreadcrumbProvider>
      </Provider>
    </ThemeProvider>
  );

  if (libs.framework.licenseIsAtLeast('standard')) {
    libs.framework.registerManagementSection({
      name: 'Beats',
      iconName: 'logoBeats',
    });

    libs.framework.registerManagementUI({
      name: 'Central Management',
      basePath: BASE_PATH,
    });
  }
}

startApp(compose());
