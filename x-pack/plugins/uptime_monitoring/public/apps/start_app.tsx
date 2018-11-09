/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPage, EuiPageContent, EuiTitle } from '@elastic/eui';
import React from 'react';
import 'react-vis/dist/style.css';
import 'ui-bootstrap';
import 'ui/autoload/all';
import 'ui/autoload/styles';
import 'ui/courier';
import 'ui/persisted_log';
import 'uiExports/autocompleteProviders';
import { UMFrontendLibs } from '../lib/lib';

export async function startApp(libs: UMFrontendLibs) {
  libs.framework.render(
    <EuiPage>
      <EuiPageContent>
        <EuiTitle>
          <h2>Uptime Monitoring</h2>
        </EuiTitle>
        <p>This is where the Uptime app will live.</p>
      </EuiPageContent>
    </EuiPage>
  );
}
