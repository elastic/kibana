/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { Link } from 'react-router-dom';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import { UMUpdateBreadcrumbs } from '../lib/lib';

interface OverviewPageProps {
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

export class OverviewPage extends React.Component<OverviewPageProps> {
  constructor(props: OverviewPageProps) {
    super(props);
  }

  public componentWillMount() {
    this.props.setBreadcrumbs(getOverviewPageBreadcrumbs());
  }

  public render() {
    return (
      <div>
        <EuiTitle>
          <h4>Overview</h4>
        </EuiTitle>
        <Link to="/monitor">A monitor&#8217;s ID</Link>
        <p>This is where the Uptime app will live.</p>
      </div>
    );
  }
}
