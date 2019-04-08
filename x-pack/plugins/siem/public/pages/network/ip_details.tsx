/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import { HeaderPageProps } from '../../components/header_page';
import { getNetworkUrl, NetworkComponentProps } from '../../components/link_to/redirect_to_network';
import { BreadcrumbItem } from '../../components/page/navigation/breadcrumb';
import { IpOverview } from '../../components/page/network/ip_overview';
import { IpOverviewTool } from '../../components/page/network/ip_overview/tool';
import { GlobalTime } from '../../containers/global_time';
import { IpOverviewQuery } from '../../containers/ip_overview';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { IndexType } from '../../graphql/types';
import { decodeIpv6 } from '../../lib/helpers';
import { networkModel, networkSelectors, State } from '../../store';

import { NetworkKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

interface IPDetailsComponentReduxProps {
  filterQuery: string;
}

type IPDetailsComponentProps = IPDetailsComponentReduxProps & NetworkComponentProps;

const IPDetailsComponent = pure<IPDetailsComponentProps>(
  ({
    match: {
      params: { ip },
    },
    filterQuery,
  }) => (
    <WithSource sourceId="default" indexTypes={[IndexType.FILEBEAT, IndexType.PACKETBEAT]}>
      {({ filebeatIndicesExist, indexPattern }) =>
        indicesExistOrDataTemporarilyUnavailable(filebeatIndicesExist) ? (
          <>
            <NetworkKql indexPattern={indexPattern} type={networkModel.NetworkType.page} />

            <GlobalTime>
              {({ poll, to, from, setQuery }) => (
                <IpOverviewQuery
                  sourceId="default"
                  filterQuery={filterQuery}
                  type={networkModel.NetworkType.details}
                  ip={decodeIpv6(ip)}
                >
                  {({ ipOverviewData, loading }) => (
                    <IpOverview
                      ip={decodeIpv6(ip)}
                      data={ipOverviewData}
                      loading={loading}
                      type={networkModel.NetworkType.details}
                    />
                  )}
                </IpOverviewQuery>
              )}
            </GlobalTime>
          </>
        ) : (
          <EmptyPage
            title={i18n.NO_FILEBEAT_INDICES}
            message={i18n.LETS_ADD_SOME}
            actionLabel={i18n.SETUP_INSTRUCTIONS}
            actionUrl={`${basePath}/app/kibana#/home/tutorial_directory/security`}
          />
        )
      }
    </WithSource>
  )
);

const makeMapStateToProps = () => {
  const getNetworkFilterQuery = networkSelectors.networkFilterQueryExpression();
  return (state: State) => ({
    filterQueryExpression: getNetworkFilterQuery(state) || '',
  });
};

export const IPDetails = connect(makeMapStateToProps)(IPDetailsComponent);

export const getBreadcrumbs = (ip: string): BreadcrumbItem[] => [
  {
    text: i18n.NETWORK,
    href: getNetworkUrl(),
  },
  {
    text: decodeIpv6(ip),
  },
];

export const getPageHeadline = (ip: string): HeaderPageProps => ({
  subtitle: (
    <FormattedMessage
      id="xpack.siem.ipDetails.pageSubtitle"
      defaultMessage="Last Beat: TODO from {beat}"
      values={{
        beat: <EuiLink href="#">TODO</EuiLink>,
      }}
    />
  ),
  title: decodeIpv6(ip),
  children: <IpOverviewTool />,
});
