/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import { HeaderPage } from '../../components/header_page';
import { EventsTable, HostsTable, UncommonProcessTable } from '../../components/page/hosts';
import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { manageQuery } from '../../components/page/manage_query';
import { AuthenticationsQuery } from '../../containers/authentications';
import { EventsQuery } from '../../containers/events';
import { GlobalTime } from '../../containers/global_time';
import { HostsQuery } from '../../containers/hosts';
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

interface HostsComponentReduxProps {
  filterQuery: string;
}

type HostsComponentProps = HostsComponentReduxProps;

const HostsComponent = pure<HostsComponentProps>(({ filterQuery }) => (
  <WithSource sourceId="default" indexTypes={[IndexType.AUDITBEAT]}>
    {({ auditbeatIndicesExist, indexPattern }) =>
      indicesExistOrDataTemporarilyUnavailable(auditbeatIndicesExist) ? (
        <>
          <HostsKql indexPattern={indexPattern} type={hostsModel.HostsType.page} />

          <HeaderPage
            subtitle={
              <FormattedMessage
                id="xpack.siem.hosts.pageSubtitle"
                defaultMessage="Last Beat: 23m Ago from {beat}"
                values={{
                  beat: <EuiLink href="#">AuditBeat</EuiLink>,
                }}
              />
            }
            title={<FormattedMessage id="xpack.siem.hosts.pageTitle" defaultMessage="Hosts" />}
          >
            {/* Date picker to be moved here */}
          </HeaderPage>

          <GlobalTime>
            {({ poll, to, from, setQuery }) => (
              <>
                <HostsQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  sourceId="default"
                  startDate={from}
                  poll={poll}
                  type={hostsModel.HostsType.page}
                >
                  {({ hosts, totalCount, loading, pageInfo, loadMore, id, refetch }) => (
                    <HostsTableManage
                      id={id}
                      refetch={refetch}
                      setQuery={setQuery}
                      loading={loading}
                      data={hosts}
                      totalCount={totalCount}
                      hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                      loadMore={loadMore}
                      type={hostsModel.HostsType.page}
                    />
                  )}
                </HostsQuery>

                <EuiSpacer />

                <UncommonProcessesQuery
                  endDate={to}
                  filterQuery={filterQuery}
                  poll={poll}
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
                      startDate={from}
                      data={uncommonProcesses}
                      totalCount={totalCount}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
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
                  poll={poll}
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
                      startDate={from}
                      data={authentications}
                      totalCount={totalCount}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
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
                  poll={poll}
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
                      startDate={from}
                      totalCount={totalCount}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
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
