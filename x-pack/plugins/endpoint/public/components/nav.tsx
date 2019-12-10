/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import { EuiSideNav } from '@elastic/eui';
import { AppMountContext } from 'kibana/public';

type NavProps = RouteComponentProps & {
  navigateToApp?: AppMountContext['core']['application']['navigateToApp'];
};

export const Nav = withRouter(({ history }: NavProps) => (
  <EuiSideNav
    data-test-subj="menuEndpoint"
    items={[
      {
        name: 'Endpoint',
        id: 'endpoint',
        items: [
          {
            id: 'home',
            name: 'Home',
            onClick: () => history.push('/'),
          },
          {
            id: 'management',
            name: 'Management',
            onClick: () => history.push('/management'),
          },
          {
            id: 'endpoints',
            name: 'Endpoints',
            onClick: () => history.push('/endpoints'),
          },
          {
            id: 'alerts',
            name: 'Alerts',
            onClick: () => history.push('/alerts'),
          },
        ],
      },
    ]}
  />
));
