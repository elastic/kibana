/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { BASE_PATH } from '../common/constants';
import { BreadcrumbProvider } from './components/route_with_breadcrumb';
import { compose } from './lib/compose/kibana';
import { FrontendLibs } from './lib/lib';
import { PageRouter } from './router';

function startApp(libs: FrontendLibs) {
  libs.framework.registerManagementSection('beats', 'Beats Management', BASE_PATH);
  libs.framework.render(
    <ThemeProvider theme={{ eui: euiVars }}>
      <BreadcrumbProvider>
        <PageRouter libs={libs} />
      </BreadcrumbProvider>
    </ThemeProvider>
  );
}

startApp(compose());
