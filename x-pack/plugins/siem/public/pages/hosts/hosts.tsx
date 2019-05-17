/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import {
  EventsTable,
  HostsTable,
  KpiHostsComponent,
  UncommonProcessTable,
} from '../../components/page/hosts';
import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { manageQuery } from '../../components/page/manage_query';
import { AuthenticationsQuery } from '../../containers/authentications';
import { EventsQuery } from '../../containers/events';
import { GlobalTime } from '../../containers/global_time';
import { HostsQuery } from '../../containers/hosts';
import { KpiHostsQuery } from '../../containers/kpi_hosts';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';
import { IndexType } from '../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../store';

import { HostsKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const HostsTableManage = manageQuery(HostsTable);
const EventsTableManage = manageQuery(EventsTable);
const UncommonProcessTableManage = manageQuery(UncommonProcessTable);
const KpiHostsComponentManage = manageQuery(KpiHostsComponent);
interface HostsComponentReduxProps {
  filterQuery: string;
}

type HostsComponentProps = HostsComponentReduxProps;

const indexTypes = [IndexType.AUDITBEAT];

const HostsComponent = pure<HostsComponentProps>(({ filterQuery }) => (
  <WithSource sourceId="default" indexTypes={indexTypes}>
    {({ auditbeatIndicesExist, indexPattern }) =>
      indicesExistOrDataTemporarilyUnavailable(auditbeatIndicesExist) ? (
        <>
          <HostsKql indexPattern={indexPattern} type={hostsModel.HostsType.page} />
          <GlobalTime>
            {({ to, from, setQuery }) => (
              <>
                <KpiHostsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                >
                  {({ kpiHosts, loading, id, refetch }) => (
                    <KpiHostsComponentManage
                      id={id}
                      setQuery={setQuery}
                      refetch={refetch}
                      data={kpiHosts}
                      loading={loading}
                    />
                  )}
                </KpiHostsQuery>

                <EuiSpacer />

                <HostsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  type={hostsModel.HostsType.page}
                >
                  {({ hosts, totalCount, loading, pageInfo, loadMore, id, refetch }) => (
                    <HostsTableManage
                      id={id}
                      indexPattern={indexPattern}
                      refetch={refetch}
                      setQuery={setQuery}
                      loading={loading}
                      data={hosts}
                      totalCount={totalCount}
                      hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)}
                      loadMore={loadMore}
                      type={hostsModel.HostsType.page}
                    />
                  )}
                </HostsQuery>

                <EuiSpacer />

                <UncommonProcessesQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  type={hostsModel.HostsType.page}
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
                      type={hostsModel.HostsType.page}
                    />
                  )}
                </UncommonProcessesQuery>

                <EuiSpacer />

                <AuthenticationsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  type={hostsModel.HostsType.page}
                >
                  {({ authentications, totalCount, loading, pageInfo, loadMore, id, refetch }) => (
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
                      type={hostsModel.HostsType.page}
                    />
                  )}
                </AuthenticationsQuery>

                <EuiSpacer />

                <EventsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  type={hostsModel.HostsType.page}
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
                      tiebreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)!}
                      hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                      loadMore={loadMore}
                      type={hostsModel.HostsType.page}
                    />
                  )}
                </EventsQuery>
              </>
            )}
          </GlobalTime>
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
));

const makeMapStateToProps = () => {
  const getHostsFilterQueryAsJson = hostsSelectors.hostsFilterQueryAsJson();
  const mapStateToProps = (state: State) => ({
    filterQuery: getHostsFilterQueryAsJson(state, hostsModel.HostsType.page) || '',
  });
  return mapStateToProps;
};

export const Hosts = connect(makeMapStateToProps)(HostsComponent);
