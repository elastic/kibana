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

import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';

export class HeaderBreadcrumbsComponent extends React.Component<RouteComponentProps> {
  public shouldComponentUpdate(
    nextProps: Readonly<RouteComponentProps>,
    nextState: Readonly<{}>
  ): boolean {
    if (this.props.location.pathname === nextProps.location.pathname) {
      return false;
    }
    return true;
  }
  public componentWillReceiveProps(nextProps: Readonly<RouteComponentProps>): void {
    if (this.props.location.pathname !== nextProps.location.pathname) {
      setBreadcrumbs(nextProps.location.pathname);
    }
  }

  public render() {
    const { location } = this.props;
    return (
      <EuiFlexItem grow={false} data-test-subj="datePickerContainer">
        <TabNavigation location={location.pathname} />
      </EuiFlexItem>
    );
  }
}

export const HeaderBreadcrumbs = withRouter(HeaderBreadcrumbsComponent);
