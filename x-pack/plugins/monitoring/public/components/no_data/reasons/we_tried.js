/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

export function WeTried() {
  return (
    <Fragment>
      <EuiTitle size="l">
        <h2>We couldn&apos;t activate monitoring</h2>
      </EuiTitle>
      <EuiTextColor color="subdued">
        <EuiText>
          <p>Here might be some things to check</p>
        </EuiText>
      </EuiTextColor>
      <EuiHorizontalRule size="half" />
      <EuiText className="noData__alignLeft">
        <p>
          No monitoring data found. Try setting the time filter to &quot;Last 1
          hour&quot; or see if data is available for a different time period.
        </p>
        <p>
          If data is in your cluster, you&apos;ll see your monitoring dashboards here.
        </p>
      </EuiText>
    </Fragment>
  );
}
