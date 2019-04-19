/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { pure } from 'recompose';

import { decodeIpv6 } from '../../lib/helpers';
import { FlowTargetSelectConnected } from '../flow_controls/flow_target_select_connected';
import { LastBeatStat } from '../last_beat_stat';

import { PageHeadlineComponent } from './component';
const overviewPageHeadline = {
  subtitle: (
    <FormattedMessage
      id="xpack.siem.overview.pageSubtitle"
      defaultMessage="Security Information & Event Management with the Elastic Stack"
    />
  ),
  title: <FormattedMessage id="xpack.siem.overview.pageTitle" defaultMessage="Elastic SIEM" />,
};

export const getHeaderForRoute = (pathname: string) => {
  const trailingPath = pathname.match(/.*\/(.*)$/);
  if (trailingPath !== null) {
    const pathSegment = trailingPath[1];
    switch (pathSegment) {
      case 'hosts': {
        return {
          subtitle: <LastBeatStat indexKey={'hosts'} />,
          title: <FormattedMessage id="xpack.siem.hosts.pageTitle" defaultMessage="Hosts" />,
        };
      }
      case 'overview': {
        return overviewPageHeadline;
      }
      case 'network': {
        return {
          subtitle: <LastBeatStat indexKey={'network'} />,
          title: <FormattedMessage id="xpack.siem.network.pageTitle" defaultMessage="Network" />,
        };
      }
    }

    if (pathname.match(/hosts\/.*?/)) {
      const hostId = pathSegment;
      return {
        subtitle: <LastBeatStat indexKey={'hostDetails'} hostName={hostId} />,
        title: hostId,
      };
    }
    if (pathname.match(/network\/ip\/.*?/)) {
      const ip = decodeIpv6(pathSegment);
      return {
        subtitle: <LastBeatStat indexKey={'ipDetails'} ip={ip} />,
        title: ip,
        children: <FlowTargetSelectConnected />,
      };
    }
  }
  return overviewPageHeadline;
};

type PageHeadlineComponentProps = RouteComponentProps;

const HeaderPageComponents = pure<PageHeadlineComponentProps>(({ location }) => {
  return (
    <>
      <PageHeadlineComponent {...getHeaderForRoute(location.pathname)} />
      <EuiHorizontalRule />
    </>
  );
});

export const PageHeadline = withRouter(HeaderPageComponents);
