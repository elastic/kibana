/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { Breadcrumb } from 'ui/chrome';
import { monitorBreadcrumb } from '../breadcrumbs';

interface MonitorPageProps {
  updateBreadcrumbs: (updatedBreadcrumbs: Breadcrumb) => void;
}

export class MonitorPage extends React.Component<MonitorPageProps> {
  constructor(props: { updateBreadcrumbs: (updatedBreadcrumbs: Breadcrumb) => void }) {
    super(props);
  }

  public componentWillMount() {
    this.props.updateBreadcrumbs(monitorBreadcrumb);
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
