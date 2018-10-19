/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { BASE_PATH } from '../common/constants';
import { compose } from './lib/compose/kibana';
import { FrontendLibs } from './lib/lib';

// import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
// import { ThemeProvider } from 'styled-components';
import { PageRouter } from './router';

// TODO use theme provided from parentApp when kibana supports it
import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';
import { ThemeProvider } from 'styled-components';

function startApp(libs: FrontendLibs) {
  libs.framework.registerManagementSection('beats', 'Beats Management', BASE_PATH);
  libs.framework.render(
    <ThemeProvider theme={{ eui: euiVars }}>
      <PageRouter libs={libs} />
    </ThemeProvider>
  );
}

startApp(compose());
