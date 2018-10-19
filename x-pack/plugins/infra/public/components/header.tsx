/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBreadcrumbDefinition,
  EuiHeader,
  EuiHeaderBreadcrumbs,
  EuiHeaderSection,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

interface HeaderProps {
  breadcrumbs?: EuiBreadcrumbDefinition[];
}

export class Header extends React.PureComponent<HeaderProps> {
  private staticBreadcrumbs = [
    {
      href: '#/',
      text: 'InfraOps',
    },
  ];

  public render() {
    const { breadcrumbs = [] } = this.props;

    return (
      <HeaderWrapper>
        <EuiHeaderSection>
          <EuiHeaderBreadcrumbs breadcrumbs={[...this.staticBreadcrumbs, ...breadcrumbs]} />
        </EuiHeaderSection>
      </HeaderWrapper>
    );
  }
}

const HeaderWrapper = styled(EuiHeader)`
  height: 29px;
`;
