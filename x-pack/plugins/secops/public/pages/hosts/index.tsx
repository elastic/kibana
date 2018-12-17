/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, isUndefined } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import chrome from 'ui/chrome';

import { KpiItem } from '../../../common/graphql/types';
import { EmptyPage } from '../../components/empty_page';
import {
  EventsTable,
  HostsTable,
  TypesBar,
  UncommonProcessTable,
} from '../../components/page/hosts';

import { manageQuery } from '../../components/page/manage_query';
import { EventsQuery } from '../../containers/events';
import { GlobalTime } from '../../containers/global_time';
import { HostsQuery } from '../../containers/hosts';
import { WithSource } from '../../containers/source';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';

const basePath = chrome.getBasePath();

const HostsTableManage = manageQuery(HostsTable);
const EventsTableManage = manageQuery(EventsTable);

export const Hosts = pure(() => (
  <WithSource sourceId="default">
    {({ auditbeatIndicesExist }) =>
      auditbeatIndicesExist || isUndefined(auditbeatIndicesExist) ? (
        <GlobalTime>
          {({ poll, to, from, setQuery }) => (
            <>
              <EventsQuery sourceId="default" startDate={to} endDate={from}>
                {({ kpiEventType, loading }) => (
                  <TypesBar
                    loading={loading}
                    data={kpiEventType!.map((i: KpiItem) => ({
                      x: i.count,
                      y: i.value,
                    }))}
                  />
                )}
              </EventsQuery>
              <HostsQuery sourceId="default" startDate={to} endDate={from} poll={poll}>
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
                startDate={0} // TODO: Wire this up to the date-time picker
                endDate={1544817214088} // TODO: Wire this up to the date-time picker
                cursor={null}
              >
                {({ uncommonProcesses, totalCount, loading, pageInfo, loadMore }) => (
                  <UncommonProcessTable
                    loading={loading}
                    data={uncommonProcesses}
                    totalCount={totalCount}
                    hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                    nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                    loadMore={loadMore}
                  />
                )}
              </UncommonProcessesQuery>
              <EventsQuery sourceId="default" startDate={to} endDate={from}>
                {({ events, loading, id, refetch }) => (
                  <EventsTableManage
                    id={id}
                    refetch={refetch}
                    setQuery={setQuery}
                    data={events!}
                    loading={loading}
                    startDate={from}
                    endDate={to}
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
