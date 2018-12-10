/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { getMonitorPageBreadcrumb } from '../breadcrumbs';
import { UMUpdateBreadcrumbs } from '../lib/lib';

interface MonitorPageProps {
  updateBreadcrumbs: UMUpdateBreadcrumbs;
}

export class MonitorPage extends React.Component<MonitorPageProps> {
  constructor(props: MonitorPageProps) {
    super(props);
  }

  public componentWillMount() {
    this.props.updateBreadcrumbs(getMonitorPageBreadcrumb());
  }

  public render() {
    return (
      <div>
        <EuiTitle>
          <h4>Monitor &#123;ID&#125;</h4>
        </EuiTitle>
        This is the Monitors page.
        <p>
          It will display information like the monitor&#8217;s performance over time, and other
          valuable information. In the next set of changes, this page will be replaced with more
          useful visualizations and data.
        </p>
      </div>
    );
  }
}
