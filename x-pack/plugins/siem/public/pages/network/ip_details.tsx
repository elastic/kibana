/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui/src/components/flex/flex_item';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import { FlowTargetSelect } from '../../components/flow_controls/flow_target_select';
import { HeaderPage } from '../../components/header_page';
import { LastBeatStat } from '../../components/last_beat_stat';
import { getNetworkUrl, NetworkComponentProps } from '../../components/link_to/redirect_to_network';
import { manageQuery } from '../../components/page/manage_query';
import { BreadcrumbItem } from '../../components/page/navigation/breadcrumb';
import { DomainsTable } from '../../components/page/network/domains_table';
import { IpOverview, IpOverviewId } from '../../components/page/network/ip_overview';
import { DomainsQuery } from '../../containers/domains';
import { GlobalTime } from '../../containers/global_time';
import { IpOverviewQuery } from '../../containers/ip_overview';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { Overview } from '../../graphql/types';
import { FlowDirection, FlowTarget, IndexType } from '../../graphql/types';
import { decodeIpv6 } from '../../lib/helpers';
import { networkActions, networkModel, networkSelectors, State } from '../../store';

import { NetworkKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

const DomainsTableManage = manageQuery(DomainsTable);

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;

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
            <GlobalTime>
              {({ poll, to, from, setQuery }) => (
                <>
                  <IpOverviewQuery
                    sourceId="default"
                    filterQuery={filterQuery}
                    type={networkModel.NetworkType.details}
                    ip={decodeIpv6(ip)}
                  >
                    {({ ipOverviewData, loading }) => {
                      const typeData: Overview = ipOverviewData[flowTarget]!;

                      return (
                        <>
                          <HeaderPage
                            subtitle={<LastBeatStat lastSeen={getOr(null, 'lastSeen', typeData)} />}
                            title={decodeIpv6(ip)}
                          >
                            <SelectTypeItem
                              grow={false}
                              data-test-subj={`${IpOverviewId}-select-flow-target`}
                            >
                              <FlowTargetSelect
                                id={IpOverviewId}
                                isLoading={loading}
                                selectedDirection={FlowDirection.uniDirectional}
                                selectedTarget={flowTarget}
                                displayTextOverride={[i18n.AS_SOURCE, i18n.AS_DESTINATION]}
                                updateFlowTargetAction={updateIpDetailsFlowTarget}
                              />
                            </SelectTypeItem>
                            {/* DEV NOTE: SelectTypeItem component from components/page/network/ip_overview/index.tsx to be moved here */}
                            {/* DEV NOTE: Date picker to be moved here */}
                          </HeaderPage>
                          <IpOverview
                            ip={decodeIpv6(ip)}
                            data={ipOverviewData}
                            loading={loading}
                            type={networkModel.NetworkType.details}
                            flowTarget={flowTarget}
                          />
                        </>
                      );
                    }}
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
  return (state: State) => {
    return {
      filterQuery: getNetworkFilterQuery(state, networkModel.NetworkType.details) || '',
      flowTarget: getIpDetailsFlowTargetSelector(state),
    };
  };
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
