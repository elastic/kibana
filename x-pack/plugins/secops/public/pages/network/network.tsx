/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import { manageQuery } from '../../components/page/manage_query';
import { NetworkTopNFlowTable } from '../../components/page/network';
import { GlobalTime } from '../../containers/global_time';
import { NetworkTopNFlowQuery } from '../../containers/network_top_n_flow';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { IndexType, NetworkTopNFlowType } from '../../graphql/types';
import { networkModel, networkSelectors, State } from '../../store';
import { PageContent, PageContentBody } from '../styles';
import { NetworkKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);

interface NetworkComponentReduxProps {
  filterQuery: string;
}

type NetworkComponentProps = NetworkComponentReduxProps;

const NetworkComponent = pure<NetworkComponentProps>(({ filterQuery }) => (
  <WithSource sourceId="default" indexTypes={[IndexType.FILEBEAT]}>
    {({ filebeatIndicesExist, indexPattern }) =>
      indicesExistOrDataTemporarilyUnavailable(filebeatIndicesExist) ? (
        <>
          <NetworkKql indexPattern={indexPattern} type={networkModel.NetworkType.page} />
          <PageContent data-test-subj="pageContent" panelPaddingSize="none">
            <PageContentBody data-test-subj="pane1ScrollContainer">
              <GlobalTime>
                {({ poll, to, from, setQuery }) => (
                  <>
                    <NetworkTopNFlowQuery
                      endDate={to}
                      filterQuery={filterQuery}
                      networkTopNFlowType={NetworkTopNFlowType.source}
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
                      }) => (
                        <NetworkTopNFlowTableManage
                          data={networkTopNFlow}
                          id={id}
                          hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                          loading={loading}
                          loadMore={loadMore}
                          nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                          networkTopNFlowType={NetworkTopNFlowType.source}
                          refetch={refetch}
                          setQuery={setQuery}
                          startDate={from}
                          totalCount={totalCount}
                          type={networkModel.NetworkType.page}
                        />
                      )}
                    </NetworkTopNFlowQuery>
                    <NetworkTopNFlowQuery
                      endDate={to}
                      filterQuery={filterQuery}
                      networkTopNFlowType={NetworkTopNFlowType.destination}
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
                      }) => (
                        <NetworkTopNFlowTableManage
                          data={networkTopNFlow}
                          id={id}
                          hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                          loading={loading}
                          loadMore={loadMore}
                          nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                          networkTopNFlowType={NetworkTopNFlowType.destination}
                          refetch={refetch}
                          setQuery={setQuery}
                          startDate={from}
                          totalCount={totalCount}
                          type={networkModel.NetworkType.page}
                        />
                      )}
                    </NetworkTopNFlowQuery>
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
));

const makeMapStateToProps = () => {
  const getNetworkFilterQueryAsJson = networkSelectors.networkFilterQueryAsJson();
  const mapStateToProps = (state: State) => ({
    filterQuery: getNetworkFilterQueryAsJson(state, networkModel.NetworkType.page) || '',
  });
  return mapStateToProps;
};

export const Network = connect(makeMapStateToProps)(NetworkComponent);
