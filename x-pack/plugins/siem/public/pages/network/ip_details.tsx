/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import { getNetworkUrl, NetworkComponentProps } from '../../components/link_to/redirect_to_network';
import { BreadcrumbItem } from '../../components/navigation/breadcrumbs';
import { manageQuery } from '../../components/page/manage_query';
import { DomainsTable } from '../../components/page/network/domains_table';
import { IpOverview } from '../../components/page/network/ip_overview';
import { DomainsQuery } from '../../containers/domains';
import { GlobalTime } from '../../containers/global_time';
import { IpOverviewQuery } from '../../containers/ip_overview';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { FlowTarget, IndexType } from '../../graphql/types';
import { decodeIpv6 } from '../../lib/helpers';
import { networkActions, networkModel, networkSelectors, State } from '../../store';
import { PageContent, PageContentBody } from '../styles';

import { NetworkKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

const DomainsTableManage = manageQuery(DomainsTable);

interface IPDetailsComponentReduxProps {
  filterQuery: string;
  flowTarget: FlowTarget;
}

export interface IpDetailsComponentDispatchProps {
  updateIpDetailsFlowTarget: ActionCreator<{
    flowTarget: FlowTarget;
  }>;
}

type IPDetailsComponentProps = IPDetailsComponentReduxProps &
  IpDetailsComponentDispatchProps &
  NetworkComponentProps;

const IPDetailsComponent = pure<IPDetailsComponentProps>(
  ({
    match: {
      params: { ip },
    },
    filterQuery,
    flowTarget,
    updateIpDetailsFlowTarget,
  }) => (
    <WithSource sourceId="default" indexTypes={[IndexType.FILEBEAT, IndexType.PACKETBEAT]}>
      {({ filebeatIndicesExist, indexPattern }) =>
        indicesExistOrDataTemporarilyUnavailable(filebeatIndicesExist) ? (
          <>
            <NetworkKql indexPattern={indexPattern} type={networkModel.NetworkType.details} />
            <PageContent data-test-subj="pageContent" panelPaddingSize="none">
              <PageContentBody data-test-subj="pane1ScrollContainer">
                <GlobalTime>
                  {({ poll, to, from, setQuery }) => (
                    <>
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
                            flowTarget={flowTarget}
                            updateFlowTargetAction={updateIpDetailsFlowTarget}
                          />
                        )}
                      </IpOverviewQuery>

                      <EuiSpacer size="s" />
                      <EuiHorizontalRule margin="xs" />
                      <EuiSpacer size="s" />

                      <DomainsQuery
                        endDate={to}
                        filterQuery={filterQuery}
                        flowTarget={flowTarget}
                        ip={decodeIpv6(ip)}
                        poll={poll}
                        sourceId="default"
                        startDate={from}
                        type={networkModel.NetworkType.details}
                      >
                        {({ id, domains, totalCount, pageInfo, loading, loadMore, refetch }) => (
                          <DomainsTableManage
                            data={domains}
                            id={id}
                            flowTarget={flowTarget}
                            hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                            ip={ip}
                            loading={loading}
                            loadMore={loadMore}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                            refetch={refetch}
                            setQuery={setQuery}
                            startDate={from}
                            endDate={to}
                            totalCount={totalCount}
                            type={networkModel.NetworkType.details}
                          />
                        )}
                      </DomainsQuery>
                    </>
                  )}
                </GlobalTime>
              </PageContentBody>
            </PageContent>
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
  const getNetworkFilterQuery = networkSelectors.networkFilterQueryAsJson();
  const getIpDetailsFlowTargetSelector = networkSelectors.ipDetailsFlowTargetSelector();
  return (state: State) => ({
    filterQuery: getNetworkFilterQuery(state, networkModel.NetworkType.details) || '',
    flowTarget: getIpDetailsFlowTargetSelector(state),
  });
};

export const IPDetails = connect(
  makeMapStateToProps,
  {
    updateIpDetailsFlowTarget: networkActions.updateIpDetailsFlowTarget,
  }
)(IPDetailsComponent);

export const getBreadcrumbs = (ip: string): BreadcrumbItem[] => [
  {
    text: i18n.NETWORK,
    href: getNetworkUrl(),
  },
  {
    text: decodeIpv6(ip),
  },
];
