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

import { EventsQuery } from '../../containers/events';
import { HostsQuery } from '../../containers/hosts';
import { WithSource } from '../../containers/source';
import { UncommonProcessesQuery } from '../../containers/uncommon_processes';

const basePath = chrome.getBasePath();

// TODO: wire up the date picker to remove the hard-coded start/end dates, which show good data for the KPI event type
const startDate = 1514782800000;
const endDate = 1546318799999;

export const Hosts = pure(() => (
  <WithSource sourceId="default">
    {({ auditbeatIndicesExist }) =>
      auditbeatIndicesExist || isUndefined(auditbeatIndicesExist) ? (
        <>
          <EventsQuery sourceId="default" startDate={startDate} endDate={endDate}>
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
          <HostsQuery sourceId="default" startDate={startDate} endDate={endDate} cursor={null}>
            {({ hosts, totalCount, loading, pageInfo, loadMore }) => (
              <HostsTable
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
          <EventsQuery sourceId="default" startDate={startDate} endDate={endDate}>
            {({ events, loading }) => (
              <EventsTable
                data={events!}
                loading={loading}
                startDate={startDate}
                endDate={endDate}
              />
            )}
          </EventsQuery>
        </>
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
