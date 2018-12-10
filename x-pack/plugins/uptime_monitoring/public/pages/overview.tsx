/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from 'ui/chrome';
import { overviewBreadcrumb } from '../breadcrumbs';

interface OverviewPageProps {
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
}

export class OverviewPage extends React.Component<OverviewPageProps> {
  constructor(props: OverviewPageProps) {
    super(props);
  }

  public componentWillMount() {
    this.props.setBreadcrumbs([overviewBreadcrumb]);
  }

  public render() {
    return (
      <div>
        <EuiTitle>
          <h4>Overview</h4>
        </EuiTitle>
        <Link to="/monitor">A monitor's ID</Link>
        <p>This is where the Uptime app will live.</p>
      </div>
    );
  }
}
