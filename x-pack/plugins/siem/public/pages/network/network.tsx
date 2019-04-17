/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import { getEmptyTagValue } from '../../components/empty_value';
import { HeaderPage } from '../../components/header_page';
import { manageQuery } from '../../components/page/manage_query';
import { KpiNetworkComponent, NetworkTopNFlowTable } from '../../components/page/network';
import { LastBeatDomain } from '../../components/page/network/last_beat_domain';
import { NetworkDnsTable } from '../../components/page/network/network_dns_table';
import { GlobalTime } from '../../containers/global_time';
import { KpiNetworkQuery } from '../../containers/kpi_network';
import { NetworkDnsQuery } from '../../containers/network_dns';
import { NetworkTopNFlowQuery } from '../../containers/network_top_n_flow';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { FlowTarget, IndexType } from '../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../store';

import { NetworkKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);
const NetworkDnsTableManage = manageQuery(NetworkDnsTable);
const KpiNetworkComponentManage = manageQuery(KpiNetworkComponent);
interface NetworkComponentReduxProps {
  filterQuery: string;
  flowTarget: FlowTarget;
  overviewStatIp: string | null;
}

export interface NetworkComponentDispatchProps {
  updateOverviewStatIp: ActionCreator<{
    overviewStatIp: string;
  }>;
}

type NetworkComponentProps = NetworkComponentReduxProps & NetworkComponentDispatchProps;
const NetworkComponent = pure<NetworkComponentProps>(
  ({ filterQuery, flowTarget, overviewStatIp, updateOverviewStatIp }) => (
    <WithSource sourceId="default" indexTypes={[IndexType.FILEBEAT, IndexType.PACKETBEAT]}>
      {({ filebeatIndicesExist, indexPattern }) =>
        indicesExistOrDataTemporarilyUnavailable(filebeatIndicesExist) ? (
          <>
            <NetworkKql indexPattern={indexPattern} type={networkModel.NetworkType.page} />

            <HeaderPage
              subtitle={
                overviewStatIp ? (
                  <LastBeatDomain ip={overviewStatIp} flowTarget={flowTarget} />
                ) : (
                  getEmptyTagValue()
                )
              }
              title={
                <FormattedMessage id="xpack.siem.network.pageTitle" defaultMessage="Network" />
              }
            >
              {/* DEV NOTE: Date picker to be moved here */}
            </HeaderPage>

            <GlobalTime>
              {({ poll, to, from, setQuery }) => (
                <>
                  <KpiNetworkQuery
                    endDate={to}
                    filterQuery={filterQuery}
                    poll={poll}
                    sourceId="default"
                    startDate={from}
                  >
                    {({ kpiNetwork, loading, id, refetch }) => {
                      return (
                        <KpiNetworkComponentManage
                          id={id}
                          setQuery={setQuery}
                          refetch={refetch}
                          data={kpiNetwork}
                          loading={loading}
                        />
                      );
                    }}
                  </KpiNetworkQuery>

                  <EuiSpacer />

                  <NetworkTopNFlowQuery
                    endDate={to}
                    filterQuery={filterQuery}
                    poll={poll}
                    sourceId="default"
                    startDate={from}
                    type={networkModel.NetworkType.page}
                  >
                    {({
                      totalCount,
                      loading,
                      networkTopNFlow,
                      pageInfo,
                      loadMore,
                      id,
                      refetch,
                    }) => {
                      const newOverviewStatIp = getOr(null, '[0].node.source.ip', networkTopNFlow);
                      if (newOverviewStatIp !== null) {
                        updateOverviewStatIp({ overviewStatIp: newOverviewStatIp });
                      }
                      return (
                        <NetworkTopNFlowTableManage
                          data={networkTopNFlow}
                          id={id}
                          hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                          loading={loading}
                          loadMore={loadMore}
                          nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                          refetch={refetch}
                          setQuery={setQuery}
                          startDate={from}
                          totalCount={totalCount}
                          type={networkModel.NetworkType.page}
                        />
                      );
                    }}
                  </NetworkTopNFlowQuery>

                  <EuiSpacer />

                  <NetworkDnsQuery
                    endDate={to}
                    filterQuery={filterQuery}
                    poll={poll}
                    sourceId="default"
                    startDate={from}
                    type={networkModel.NetworkType.page}
                  >
                    {({ totalCount, loading, networkDns, pageInfo, loadMore, id, refetch }) => (
                      <NetworkDnsTableManage
                        data={networkDns}
                        id={id}
                        hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                        loading={loading}
                        loadMore={loadMore}
                        nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                        refetch={refetch}
                        setQuery={setQuery}
                        startDate={from}
                        totalCount={totalCount}
                        type={networkModel.NetworkType.page}
                      />
                    )}
                  </NetworkDnsQuery>
                </>
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
  const getNetworkFilterQueryAsJson = networkSelectors.networkFilterQueryAsJson();
  const getIpDetailsFlowTargetSelector = networkSelectors.ipDetailsFlowTargetSelector();
  const getOverviewStateIpSelector = networkSelectors.overviewStatIpSelector();
  const mapStateToProps = (state: State) => ({
    filterQuery: getNetworkFilterQueryAsJson(state, networkModel.NetworkType.page) || '',
    flowTarget: getIpDetailsFlowTargetSelector(state),
    overviewStatIp: getOverviewStateIpSelector(state),
  });
  return mapStateToProps;
};

export const Network = connect(
  makeMapStateToProps,
  {
    updateOverviewStatIp: networkActions.updateOverviewStatIp,
  }
)(NetworkComponent);
