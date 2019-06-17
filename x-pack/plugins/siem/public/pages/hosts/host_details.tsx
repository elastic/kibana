/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { getOr, isEmpty } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { pure } from 'recompose';
import { Breadcrumb } from 'ui/chrome';
import { StaticIndexPattern } from 'ui/index_patterns';

import { ESTermQuery } from '../../../common/typed_json';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import { getHostsUrl, HostComponentProps } from '../../components/link_to/redirect_to_hosts';
import { EventsTable, UncommonProcessTable } from '../../components/page/hosts';
import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { HostOverview } from '../../components/page/hosts/host_overview';
import { manageQuery } from '../../components/page/manage_query';
import { AuthenticationsQuery } from '../../containers/authentications';
import { EventsQuery } from '../../containers/events';
import { GlobalTime } from '../../containers/global_time';
import { HostOverviewByNameQuery } from '../../containers/hosts/overview';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';
import { LastEventIndexKey } from '../../graphql/types';
import { convertKueryToElasticSearchQuery, escapeQueryValue } from '../../lib/keury';
import { hostsModel, hostsSelectors, State } from '../../store';

import { HostsEmptyPage } from './hosts_empty_page';
import { HostsKql } from './kql';
import * as i18n from './translations';

const type = hostsModel.HostsType.details;

const HostOverviewManage = manageQuery(HostOverview);
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
      params: { hostName },
    },
    filterQueryExpression,
  }) => (
    <WithSource sourceId="default">
      {({ indicesExist, indexPattern }) =>
        indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
          <StickyContainer>
            <FiltersGlobal>
              <HostsKql indexPattern={indexPattern} type={type} />
            </FiltersGlobal>

            <HeaderPage
              subtitle={
                <LastEventTime indexKey={LastEventIndexKey.hostDetails} hostName={hostName} />
              }
              title={hostName}
            />

            <GlobalTime>
              {({ to, from, setQuery }) => (
                <>
                  <HostOverviewByNameQuery
                    sourceId="default"
                    hostName={hostName}
                    startDate={from}
                    endDate={to}
                  >
                    {({ hostOverview, loading, id, refetch }) => (
                      <HostOverviewManage
                        id={id}
                        refetch={refetch}
                        setQuery={setQuery}
                        data={hostOverview}
                        loading={loading}
                      />
                    )}
                  </HostOverviewByNameQuery>

                  <EuiHorizontalRule />

                  <AuthenticationsQuery
                    sourceId="default"
                    startDate={from}
                    endDate={to}
                    filterQuery={getFilterQuery(hostName, filterQueryExpression, indexPattern)}
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
                        data={authentications}
                        totalCount={totalCount}
                        nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                        hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                        loadMore={loadMore}
                        type={type}
                      />
                    )}
                  </AuthenticationsQuery>

                  <EuiSpacer />

                  <UncommonProcessesQuery
                    sourceId="default"
                    startDate={from}
                    endDate={to}
                    filterQuery={getFilterQuery(hostName, filterQueryExpression, indexPattern)}
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
                        data={uncommonProcesses}
                        totalCount={totalCount}
                        nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                        hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                        loadMore={loadMore}
                        type={type}
                      />
                    )}
                  </UncommonProcessesQuery>

                  <EuiSpacer />

                  <EventsQuery
                    endDate={to}
                    filterQuery={getFilterQuery(hostName, filterQueryExpression, indexPattern)}
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
                        totalCount={totalCount}
                        nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                        tiebreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)}
                        hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                        loadMore={loadMore}
                        type={type}
                      />
                    )}
                  </EventsQuery>
                </>
              )}
            </GlobalTime>
          </StickyContainer>
        ) : (
          <>
            <HeaderPage title={hostName} />

            <HostsEmptyPage />
          </>
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

export const getBreadcrumbs = (hostId: string): Breadcrumb[] => [
  {
    text: i18n.PAGE_TITLE,
    href: getHostsUrl(),
  },
  {
    text: hostId,
  },
];

const getFilterQuery = (
  hostName: string | null,
  filterQueryExpression: string,
  indexPattern: StaticIndexPattern
): ESTermQuery | string =>
  isEmpty(filterQueryExpression)
    ? hostName
      ? { term: { 'host.name': hostName } }
      : ''
    : convertKueryToElasticSearchQuery(
        `${filterQueryExpression} ${
          hostName ? `and host.name: "${escapeQueryValue(hostName)}"` : ''
        }`,
        indexPattern
      );
