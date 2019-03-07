/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, isEmpty } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import chrome from 'ui/chrome';
import { StaticIndexPattern } from 'ui/index_patterns';

import { ESTermQuery } from '../../../common/typed_json';
import { EmptyPage } from '../../components/empty_page';
import { getHostsUrl, HostComponentProps } from '../../components/link_to/redirect_to_hosts';
import { EventsTable, UncommonProcessTable } from '../../components/page/hosts';
import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { HostSummary } from '../../components/page/hosts/host_summary';
import { manageQuery } from '../../components/page/manage_query';
import { BreadcrumbItem } from '../../components/page/navigation/breadcrumb';
import { AuthenticationsQuery } from '../../containers/authentications';
import { EventsQuery } from '../../containers/events';
import { GlobalTime } from '../../containers/global_time';
import { HostsQuery } from '../../containers/hosts';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';
import { IndexType } from '../../graphql/types';
import { convertKueryToElasticSearchQuery, escapeQueryValue } from '../../lib/keury';
import { hostsModel, hostsSelectors, State } from '../../store';
import { PageContent, PageContentBody } from '../styles';

import { HostsKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();
const type = hostsModel.HostsType.details;

const HostSummaryManage = manageQuery(HostSummary);
const AuthenticationTableManage = manageQuery(AuthenticationTable);
const UncommonProcessTableManage = manageQuery(UncommonProcessTable);
const EventsTableManage = manageQuery(EventsTable);

interface HostDetailsComponentReduxProps {
  filterQueryExpression: string;
}

type HostDetailsComponentProps = HostDetailsComponentReduxProps & HostComponentProps;

const HostDetailsComponent = pure<HostDetailsComponentProps>(
  ({
    match: {
      params: { hostId },
    },
    filterQueryExpression,
  }) => (
    <WithSource sourceId="default" indexTypes={[IndexType.AUDITBEAT]}>
      {({ auditbeatIndicesExist, indexPattern }) =>
        indicesExistOrDataTemporarilyUnavailable(auditbeatIndicesExist) ? (
          <>
            <HostsKql indexPattern={indexPattern} type={type} />
            <PageContent data-test-subj="pageContent" panelPaddingSize="none">
              <PageContentBody data-test-subj="pane1ScrollContainer">
                <GlobalTime>
                  {({ poll, to, from, setQuery }) => (
                    <>
                      <HostsQuery
                        sourceId="default"
                        startDate={from}
                        endDate={to}
                        poll={poll}
                        filterQuery={getFilterQuery(hostId, filterQueryExpression, indexPattern)}
                        type={type}
                      >
                        {({ hosts, loading, id, refetch, startDate, endDate }) => (
                          <HostSummaryManage
                            id={id}
                            refetch={refetch}
                            setQuery={setQuery}
                            startDate={startDate}
                            endDate={endDate}
                            data={hosts}
                            loading={loading}
                          />
                        )}
                      </HostsQuery>
                      <AuthenticationsQuery
                        sourceId="default"
                        startDate={from}
                        endDate={to}
                        poll={poll}
                        filterQuery={getFilterQuery(hostId, filterQueryExpression, indexPattern)}
                        type={type}
                      >
                        {({
                          authentications,
                          totalCount,
                          loading,
                          pageInfo,
                          loadMore,
                          id,
                          refetch,
                        }) => (
                          <AuthenticationTableManage
                            id={id}
                            refetch={refetch}
                            setQuery={setQuery}
                            loading={loading}
                            startDate={from}
                            data={authentications}
                            totalCount={totalCount}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                            hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                            loadMore={loadMore}
                            type={type}
                          />
                        )}
                      </AuthenticationsQuery>
                      <UncommonProcessesQuery
                        sourceId="default"
                        startDate={from}
                        endDate={to}
                        poll={poll}
                        filterQuery={getFilterQuery(hostId, filterQueryExpression, indexPattern)}
                        type={type}
                      >
                        {({
                          uncommonProcesses,
                          totalCount,
                          loading,
                          pageInfo,
                          loadMore,
                          id,
                          refetch,
                        }) => (
                          <UncommonProcessTableManage
                            id={id}
                            refetch={refetch}
                            setQuery={setQuery}
                            loading={loading}
                            startDate={from}
                            data={uncommonProcesses}
                            totalCount={totalCount}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                            hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                            loadMore={loadMore}
                            type={type}
                          />
                        )}
                      </UncommonProcessesQuery>
                      <EventsQuery
                        endDate={to}
                        filterQuery={getFilterQuery(hostId, filterQueryExpression, indexPattern)}
                        poll={poll}
                        sourceId="default"
                        startDate={from}
                        type={type}
                      >
                        {({ events, loading, id, refetch, totalCount, pageInfo, loadMore }) => (
                          <EventsTableManage
                            id={id}
                            refetch={refetch}
                            setQuery={setQuery}
                            data={events!}
                            loading={loading}
                            startDate={from}
                            totalCount={totalCount}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                            tiebreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)!}
                            hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                            loadMore={loadMore}
                            type={type}
                          />
                        )}
                      </EventsQuery>
                    </>
                  )}
                </GlobalTime>
              </PageContentBody>
            </PageContent>
          </>
        ) : (
          <EmptyPage
            title={i18n.NO_AUDITBEAT_INDICES}
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
  const getHostsFilterQuery = hostsSelectors.hostsFilterQueryExpression();
  return (state: State) => ({
    filterQueryExpression: getHostsFilterQuery(state, type) || '',
  });
};

export const HostDetails = connect(makeMapStateToProps)(HostDetailsComponent);

export const getBreadcrumbs = (hostId: string): BreadcrumbItem[] => [
  {
    text: i18n.HOSTS,
    href: getHostsUrl(),
  },
  {
    text: hostId,
  },
];

const getFilterQuery = (
  hostId: string,
  filterQueryExpression: string,
  indexPattern: StaticIndexPattern
): ESTermQuery | string =>
  isEmpty(filterQueryExpression)
    ? { term: { 'host.id': hostId } }
    : convertKueryToElasticSearchQuery(
        `${filterQueryExpression} and host.id: ${escapeQueryValue(hostId)}`,
        indexPattern
      );
