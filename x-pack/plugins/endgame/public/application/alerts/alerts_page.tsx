/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { Page } from '../../components/page';

export class AlertsPage extends PureComponent {
  render() {
    return (
      <Page title="Alerts">
        <EuiCallOut title="Not Implemented" color="primary" iconType="help">
          <p>Not yet implemented... but soon :-)</p>
        </EuiCallOut>
      </Page>
    );
  }
}
