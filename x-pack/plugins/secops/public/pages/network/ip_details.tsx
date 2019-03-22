/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import styled from 'styled-components';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import { getNetworkUrl, NetworkComponentProps } from '../../components/link_to/redirect_to_network';
import { BreadcrumbItem } from '../../components/page/navigation/breadcrumb';
import { IpOverview } from '../../components/page/network/ip_overview';
import { GlobalTime } from '../../containers/global_time';
import { IpOverviewQuery } from '../../containers/ip_overview';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { IndexType } from '../../graphql/types';
import { decodeIpv6 } from '../../lib/helpers';
import { networkModel, networkSelectors, State } from '../../store';

import { NetworkKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();
const type = networkModel.NetworkType.details;

interface IPDetailsComponentReduxProps {
  filterQuery: string;
}

const CustomPageContent = styled.div`
  margin-top: 106px;
`;

const CustomPageContentBody = styled.div`
  padding: 12px;
`;

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
            <CustomPageContent data-test-subj="pageContent">
              <CustomPageContentBody data-test-subj="pane1ScrollContainer">
                <GlobalTime>
                  {({ poll, to, from, setQuery }) => (
                    <IpOverviewQuery
                      sourceId="default"
                      startDate={from}
                      endDate={to}
                      filterQuery={filterQuery}
                      type={networkModel.NetworkType.page}
                      ip={decodeIpv6(ip)}
                    >
                      {({ id, ipOverviewData, loading }) => (
                        <IpOverview
                          ip={decodeIpv6(ip)}
                          data={ipOverviewData}
                          startDate={from}
                          endDate={to}
                          loading={loading}
                          type={networkModel.NetworkType.page}
                        />
                      )}
                    </IpOverviewQuery>
                  )}
                </GlobalTime>
              </CustomPageContentBody>
            </CustomPageContent>
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
    filterQueryExpression: getNetworkFilterQuery(state, type) || '',
  });
};

export const IPDetails = connect(makeMapStateToProps)(IPDetailsComponent);

export const getBreadcrumbs = (ip: string): BreadcrumbItem[] => [
  {
    text: i18n.NETWORK,
    href: getNetworkUrl(),
  },
  {
    text: 'ip',
  },
  {
    text: decodeIpv6(ip),
  },
];
