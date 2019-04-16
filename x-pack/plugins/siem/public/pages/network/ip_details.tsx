/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import { EuiToolTip } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import { getEmptyTagValue } from '../../components/empty_value';
import { HeaderPage } from '../../components/header_page';
import { LastBeatStat } from '../../components/last_beat_stat';
import { getNetworkUrl, NetworkComponentProps } from '../../components/link_to/redirect_to_network';
import { manageQuery } from '../../components/page/manage_query';
import { BreadcrumbItem } from '../../components/page/navigation/breadcrumb';
import { DomainsTable } from '../../components/page/network/domains_table';
import { IpOverview } from '../../components/page/network/ip_overview';
import { DomainsQuery } from '../../containers/domains';
import { FlowTypeSelect } from '../../components/page/network/ip_overview/flow_type_select';
import { GlobalTime } from '../../containers/global_time';
import { IpOverviewQuery } from '../../containers/ip_overview';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { IpOverviewType, Overview } from '../../graphql/types';
import { FlowTarget, IndexType } from '../../graphql/types';
import { decodeIpv6 } from '../../lib/helpers';
import { networkActions, networkModel, networkSelectors, State } from '../../store';

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
  flowType: IpOverviewType;
}
export interface IPDetailsDispatchProps {
  updateIpOverviewFlowType: ActionCreator<{
    flowType: IpOverviewType;
  }>;
}

type IPDetailsComponentProps = IPDetailsComponentReduxProps &
  IpDetailsComponentDispatchProps &
  NetworkComponentProps;
type IPDetailsComponentProps = IPDetailsComponentReduxProps &
  IPDetailsDispatchProps &
  NetworkComponentProps;

const IPDetailsComponent = pure<IPDetailsComponentProps>(
  ({
    match: {
      params: { ip },
    },
    filterQuery,
    flowType,
    updateIpOverviewFlowType,
  }) => {
    return (
      <WithSource sourceId="default" indexTypes={[IndexType.FILEBEAT, IndexType.PACKETBEAT]}>
        {({ filebeatIndicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(filebeatIndicesExist) ? (
            <>
              <GlobalTime>
                {({ poll, to, from, setQuery }) => (
                  <IpOverviewQuery
                    sourceId="default"
                    filterQuery={filterQuery}
                    type={networkModel.NetworkType.details}
                    ip={decodeIpv6(ip)}
                  >
                    {({ ipOverviewData, loading }) => {
                      const typeData: Overview = ipOverviewData[flowType]!;
                      return (
                        <>
                          <NetworkKql
                            indexPattern={indexPattern}
                            type={networkModel.NetworkType.page}
                          />

                          <HeaderPage
                            subtitle={<LastBeatStat lastSeen={getOr(null, 'lastSeen', typeData)} />}
                            title={decodeIpv6(ip)}
                          >
                            <FlowTypeSelect
                              loading={loading}
                              flowType={flowType}
                              updateIpOverviewFlowType={updateIpOverviewFlowType}
                            />
                            {/* DEV NOTE: SelectTypeItem component from components/page/network/ip_overview/index.tsx to be moved here */}
                            {/* DEV NOTE: Date picker to be moved here */}
                          </HeaderPage>
                          <IpOverview
                            ip={decodeIpv6(ip)}
                            data={ipOverviewData}
                            loading={loading}
                            flowType={flowType}
                            type={networkModel.NetworkType.details}
                          />
                        </>
                      );
                    }}
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
    );
  }
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
  const getIpOverviewSelector = networkSelectors.ipOverviewSelector();
  const getNetworkFilterQuery = networkSelectors.networkFilterQueryAsJson();
  const getIpDetailsFlowTargetSelector = networkSelectors.ipDetailsFlowTargetSelector();
  return (state: State) => {
    const { flowType } = getIpOverviewSelector(state) || '';
    return {
      filterQuery: getNetworkFilterQuery(state, networkModel.NetworkType.details) || '',
    flowTarget: getIpDetailsFlowTargetSelector(state),
      flowType,
    };
  };
};

export const IPDetails = connect(
  makeMapStateToProps,
  {
    updateIpDetailsFlowTarget: networkActions.updateIpDetailsFlowTarget,
  }
)(IPDetailsComponent);
export const IPDetails = connect(
  makeMapStateToProps,
  {
    updateIpOverviewFlowType: networkActions.updateIpOverviewFlowType,
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
