/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiTitle } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { pure } from 'recompose';
import styled from 'styled-components';

import { getPageHeadline as getHostDetailsPageHeadline } from '../../pages/hosts/host_details';
import { getPageHeadline as getHostPageHeadline } from '../../pages/hosts/hosts';
import { getPageHeadline as getIpDetailsPageHeadline } from '../../pages/network/ip_details';
import { getPageHeadline as getNetworkPageHeadline } from '../../pages/network/network';
import { getPageHeadline as getOverviewPageHeadline } from '../../pages/overview/overview';
import { hostsModel, hostsSelectors, networkSelectors, State } from '../../store';
import { LastBeatStat } from '../last_beat_stat';
import { LastBeatDomain } from '../page/network/last_beat_domain';
export interface PageHeadlineProps {
  children?: React.ReactNode;
  statType?: string;
  subtitle?: string | React.ReactNode;
  title: string | React.ReactNode;
}

interface PageHeadlineReduxProps {
  overviewStatHost: hostsModel.OverviewStatHostModel;
  overviewStatIp: string | null;
}

export const FlexGroup = styled(EuiFlexGroup)`
  margin-top: 120px;
`;

const getEventStat = (statType: string, stats: PageHeadlineReduxProps) => {
  // console.log('statType', statType);
  // console.log('stats', stats);
  switch (statType) {
    case 'overviewStatHost': {
      const stat = get('overviewStatHost.lastSeen', stats);
      return <LastBeatStat isLoading={!stat} lastSeen={stat} />;
    }
    // case 'overviewStatIp': {
    //   return <LastBeatDomain ip={stats.overviewStatIp} flowTarget={flowTarget} />
    // }
  }
  return statType;
};

export const getHeaderForRoute = (pathname: string, stats: {}) => {
  const trailingPath = pathname.match(/.*\/(.*)$/);
  if (trailingPath !== null) {
    const pathSegment = trailingPath[1];
    switch (pathSegment) {
      case 'hosts': {
        const { statType, title } = getHostPageHeadline();
        const subtitle = getEventStat(statType, stats);
        return { subtitle, title };
      }
      case 'overview': {
        return getOverviewPageHeadline();
      }
      case 'network': {
        return getNetworkPageHeadline();
      }
    }

    if (pathname.match(/hosts\/.*?/)) {
      const { statType, title } = getHostDetailsPageHeadline(pathSegment);
      const subtitle = getEventStat(statType, stats);
      return { subtitle, title };
    } else if (pathname.match(/network\/ip\/.*?/)) {
      return getIpDetailsPageHeadline(pathSegment);
    }
  }
  return getOverviewPageHeadline();
};

type PageHeadlineComponentProps = RouteComponentProps & PageHeadlineProps & PageHeadlineReduxProps;

const PageHeadlineComponent = pure<PageHeadlineProps>(({ children, subtitle, title }) => (
  <FlexGroup alignItems="center">
    <EuiFlexItem>
      <EuiTitle size="l">
        <h1>{title}</h1>
      </EuiTitle>

      <EuiText color="subdued" size="s">
        {subtitle}
      </EuiText>
    </EuiFlexItem>

    {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
  </FlexGroup>
));

const HeaderPageComponents = pure<PageHeadlineComponentProps>(
  ({ location, children, overviewStatHost }) => (
    <>
      <PageHeadlineComponent
        {...{ children, ...getHeaderForRoute(location.pathname, { overviewStatHost }) }}
      />
      <EuiHorizontalRule />
    </>
  )
);

const mapStateToProps = () => {
  const getOverviewStatHost = hostsSelectors.overviewStatHost();
  const getOverviewStateIpSelector = networkSelectors.overviewStatIpSelector();
  return (state: State) => ({
    overviewStatHost: getOverviewStatHost(state) || {},
    overviewStatIp: getOverviewStateIpSelector(state),
  });
};

export const PageHeadline = withRouter(connect(mapStateToProps)(HeaderPageComponents));
