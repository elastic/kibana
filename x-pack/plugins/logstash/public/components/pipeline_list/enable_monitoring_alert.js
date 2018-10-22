/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';

export function EnableMonitoringAlert() {
  return (
    <p>
      <strong>Enable monitoring. </strong>
      In the <EuiCode>kibana.yml</EuiCode> file, set
      <EuiCode>xpack.monitoring.enabled</EuiCode> and
      <EuiCode>xpack.monitoring.ui.enabled</EuiCode> to
      <EuiCode>true</EuiCode>.
    </p>
  );
}
