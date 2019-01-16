/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, isUndefined } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import chrome from 'ui/chrome';

import { EmptyPage } from '../../components/empty_page';
import {
  EventsTable,
  HostsTable,
  TypesBar,
  UncommonProcessTable,
} from '../../components/page/hosts';
import { KpiItem } from '../../graphql/types';

import { AuthenticationTable } from '../../components/page/hosts/authentications_table';
import { manageQuery } from '../../components/page/manage_query';
import { AuthenticationsQuery } from '../../containers/authentications';
import { EventsQuery } from '../../containers/events';
import { GlobalTime } from '../../containers/global_time';
import { HostsQuery } from '../../containers/hosts';
import { KpiEventsQuery } from '../../containers/kpi_events';
import { WithSource } from '../../containers/source';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';

const basePath = chrome.getBasePath();

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const HostsTableManage = manageQuery(HostsTable);
const EventsTableManage = manageQuery(EventsTable);
const UncommonProcessTableManage = manageQuery(UncommonProcessTable);
const TypesBarManage = manageQuery(TypesBar);

export const Hosts = pure(() => (
  <WithSource sourceId="default">
    {({ auditbeatIndicesExist }) =>
      auditbeatIndicesExist || isUndefined(auditbeatIndicesExist) ? (
        <GlobalTime>
          {({ poll, to, from, setQuery }) => (
            <>
              <KpiEventsQuery sourceId="default" startDate={from} endDate={to} poll={poll}>
                {({ kpiEventType, loading, id, refetch }) => (
                  <TypesBarManage
                    id={id}
                    refetch={refetch}
                    setQuery={setQuery}
                    loading={loading}
                    data={kpiEventType!.map((i: KpiItem) => ({
                      x: i.count,
                      y: i.value,
                    }))}
                  />
                )}
              </KpiEventsQuery>
              <HostsQuery sourceId="default" startDate={from} endDate={to} poll={poll}>
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
                  />
                )}
              </HostsQuery>
              <UncommonProcessesQuery
                sourceId="default"
                startDate={from}
                endDate={to}
                poll={poll}
                cursor={null}
              >
                {({ uncommonProcesses, totalCount, loading, pageInfo, loadMore, id, refetch }) => (
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
                  />
                )}
              </UncommonProcessesQuery>
              <AuthenticationsQuery sourceId="default" startDate={from} endDate={to} poll={poll}>
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
                  />
                )}
              </AuthenticationsQuery>
              <EventsQuery sourceId="default" startDate={from} endDate={to} poll={poll}>
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
                  />
                )}
              </EventsQuery>
            </>
          )}
        </GlobalTime>
      ) : (
        <EmptyPage
          title="Looks like you don't have any auditbeat indices."
          message="Let's add some!"
          actionLabel="Setup Instructions"
          actionUrl={`${basePath}/app/kibana#/home/tutorial_directory/security`}
        />
      )
    }
  </WithSource>
));
