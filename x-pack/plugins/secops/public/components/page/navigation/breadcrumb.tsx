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

interface HeaderBreadcrumbsProps {
  breadcrumbs?: EuiBreadcrumbDefinition[];
}

export class HeaderBreadcrumbs extends React.PureComponent<HeaderBreadcrumbsProps> {
  private staticBreadcrumbs = [
    {
      href: '#/',
      text: 'secops',
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
