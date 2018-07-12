/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { Toolbar } from '../eui/toolbar/toolbar';
import { Header } from '../header';

import { EuiBreadcrumbDefinition, EuiButton } from '@elastic/eui';

interface MainLayoutProps {
  breadcrumbs?: EuiBreadcrumbDefinition[];
}

export class MainLayout extends React.PureComponent<MainLayoutProps> {
  public render() {
    return (
      <Page>
        <Header breadcrumbs={this.props.breadcrumbs} />
        <Toolbar>
          <EuiButton onClick={() => window.alert('Button clicked')} iconType="logstashFilter">
            Filter
          </EuiButton>
        </Toolbar>
        {this.props.children}
      </Page>
    );
  }
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1 0 0;
`;
