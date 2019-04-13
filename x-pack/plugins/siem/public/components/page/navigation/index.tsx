/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore: EuiBreadcrumbs has no exported member
  EuiBreadcrumbs,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { pure } from 'recompose';

import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';

export const HeaderBreadcrumbsComponent = pure<RouteComponentProps>(({ location }) => (
  <EuiFlexItem grow={false} data-test-subj="datePickerContainer">
    <TabNavigation location={location.pathname} />
    {setBreadcrumbs(location.pathname)}
  </EuiFlexItem>
));

export const HeaderBreadcrumbs = withRouter(HeaderBreadcrumbsComponent);
