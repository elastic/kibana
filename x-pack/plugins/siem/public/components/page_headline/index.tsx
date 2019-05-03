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
import { LastEventIndexKey } from '../../graphql/types';
import { decodeIpv6 } from '../../lib/helpers';
import { FlowTargetSelectConnected } from '../page/network/flow_target_select_connected';
import { LastEventTime } from '../last_event_time';

import { PageHeadlineComponent } from './headline';
const overviewPageHeadline = {
  subtitle: (
    <FormattedMessage
      id="xpack.siem.overview.pageSubtitle"
      defaultMessage="Security Information & Event Management with the Elastic Stack"
    />
  ),
  title: <FormattedMessage id="xpack.siem.overview.pageTitle" defaultMessage="SIEM" />,
};

export const getHeaderForRoute = (pathname: string) => {
  const trailingPath = pathname.match(/.*\/(.*)$/);
  if (trailingPath !== null) {
    const pathSegment = trailingPath[1];
    switch (pathSegment) {
      case 'hosts': {
        return {
          subtitle: <LastEventTime indexKey={LastEventIndexKey.hosts} />,
          title: <FormattedMessage id="xpack.siem.hosts.pageTitle" defaultMessage="Hosts" />,
        };
      }
      case 'overview': {
        return overviewPageHeadline;
      }
      case 'network': {
        return {
          subtitle: <LastEventTime indexKey={LastEventIndexKey.network} />,
          title: <FormattedMessage id="xpack.siem.network.pageTitle" defaultMessage="Network" />,
        };
      }
      case 'timelines': {
        return {
          subtitle: null,
          title: (
            <FormattedMessage id="xpack.siem.timelines.pageTitle" defaultMessage="Timelines" />
          ),
        };
      }
    }

    if (pathname.match(/hosts\/.*?/)) {
      const hostId = pathSegment;
      return {
        subtitle: <LastEventTime indexKey={LastEventIndexKey.hostDetails} hostName={hostId} />,
        title: hostId,
      };
    }
    if (pathname.match(/network\/ip\/.*?/)) {
      const ip = decodeIpv6(pathSegment);
      return {
        subtitle: <LastEventTime indexKey={LastEventIndexKey.ipDetails} ip={ip} />,
        title: ip,
        children: <FlowTargetSelectConnected />,
      };
    }
  }
  return overviewPageHeadline;
};

type PageHeadlineComponentProps = RouteComponentProps;

export const PageHeadlineComponents = pure<PageHeadlineComponentProps>(({ location }) => {
  return (
    <>
      <PageHeadlineComponent
        data-test-subj="page_headline"
        {...getHeaderForRoute(location.pathname)}
      />
      <EuiHorizontalRule />
    </>
  );
});

export const PageHeadline = withRouter(PageHeadlineComponents);
