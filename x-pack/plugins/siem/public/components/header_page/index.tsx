/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { pure } from 'recompose';
import styled from 'styled-components';

import { getPageHeadline as getHostDetailsPageHeadline } from '../../pages/hosts/host_details';
import { getPageHeadline as getHostPageHeadline } from '../../pages/hosts/hosts';
import { getPageHeadline as getIpDetailsPageHeadline } from '../../pages/network/ip_details';
import { getPageHeadline as getNetworkPageHeadline } from '../../pages/network/network';
import { getPageHeadline as getOverviewPageHeadline } from '../../pages/overview/overview';

export interface HeaderPageProps {
  children?: React.ReactNode;
  subtitle: string | React.ReactNode;
  title: string | React.ReactNode;
}

export const FlexGroup = styled(EuiFlexGroup)`
  margin-top: 120px;
`;

export const getHeaderForRoute = (pathname: string): HeaderPageProps | null => {
  const trailingPath = pathname.match(/.*\/(.*)$/);
  if (trailingPath !== null) {
    const pathSegment = trailingPath[1];

    switch (pathSegment) {
      case 'hosts': {
        return getHostPageHeadline();
      }
      case 'overview': {
        return getOverviewPageHeadline();
      }
      case 'network': {
        return getNetworkPageHeadline();
      }
    }

    if (pathname.match(/hosts\/.*?/)) {
      return getHostDetailsPageHeadline(pathSegment);
    } else if (pathname.match(/network\/ip\/.*?/)) {
      return getIpDetailsPageHeadline(pathSegment);
    }
  }
  return getOverviewPageHeadline();
};

type HeaderPageComponentProps = RouteComponentProps & HeaderPageProps;

const PageHeadline = pure<HeaderPageProps>(({ children, subtitle, title }) => (
  <FlexGroup alignItems="center">
    <EuiFlexItem>
      <EuiTitle size="l">
        <h1>{title}</h1>
      </EuiTitle>

      <EuiText color="subdued" size="s">
        <p>{subtitle}</p>
      </EuiText>
    </EuiFlexItem>

    {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
  </FlexGroup>
));

export const HeaderPageComponents = pure<HeaderPageComponentProps>(({ location, children }) => (
  <>
    <PageHeadline {...{ children, ...getHeaderForRoute(location.pathname) }} />
    <EuiHorizontalRule />
  </>
));

export const HeaderPage = withRouter(HeaderPageComponents);
