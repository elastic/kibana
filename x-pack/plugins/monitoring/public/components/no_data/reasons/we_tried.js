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
          No Monitoring data could be found for the selected time period, but we
          could not find the cluster setting that makes the data unavailable.
        </p>
        <p>
          There may be data available for a different time period than we have
          selected. Try adjusting the time filter controls to a time range where
          the Monitoring data is expected.
        </p>
        <p>
          We are refreshing the search for data in the background. If cluster data
          is found, we will redirect to the cluster overview page.
        </p>
      </EuiText>
    </Fragment>
  );
}
