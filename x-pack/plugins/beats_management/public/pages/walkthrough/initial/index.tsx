/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton } from '@elastic/eui';
import React, { Component } from 'react';
import { NoDataLayout } from '../../../components/layouts/no_data';
// import { Switch } from 'react-router-dom';
import { WalkthroughLayout } from '../../../components/layouts/walkthrough';
import { ChildRoutes } from '../../../components/navigation/child_routes';
import { ConnectedLink } from '../../../components/navigation/connected_link';
import { RouteConfig } from '../../../utils/page_loader';

interface PageProps {
  routes: RouteConfig[];
  location: any;
}

export class InitialWalkthroughPage extends Component<PageProps> {
  public render() {
    if (this.props.location.pathname === '/walkthrough/initial') {
      return (
        <NoDataLayout
          title="Beats central management"
          actionSection={
            <ConnectedLink path="/overview/initial/beat">
              <EuiButton color="primary" fill>
                Enroll Beat
              </EuiButton>
            </ConnectedLink>
          }
        >
          <p>Manage your configurations in a central location.</p>
        </NoDataLayout>
      );
    }
    return (
      <WalkthroughLayout
        title="Get started with Beats central management"
        walkthroughSteps={[
          {
            id: '/walkthrough/initial/beat',
            name: 'Enroll Beat',
          },
          {
            id: '/walkthrough/initial/tag',
            name: 'Create tag',
          },
          {
            id: '/walkthrough/initial/finish',
            name: 'Finish',
          },
        ]}
        goTo={() => {
          // TODO implament goto
        }}
        activePath={this.props.location.pathname}
      >
        <ChildRoutes routes={this.props.routes} {...this.props} />
      </WalkthroughLayout>
    );
  }
}
