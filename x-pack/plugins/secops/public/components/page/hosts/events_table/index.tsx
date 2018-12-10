/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, noop } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import { EventItem } from '../../../../../common/graphql/types';
import { EventsQuery } from '../../../../containers/events';
import { BasicTable } from '../../../basic_table';
import { DraggableWrapper, DragEffects } from '../../../drag_and_drop/draggable_wrapper';
import { ProviderContainer } from '../../../visualization_placeholder';
import { Provider } from '../../../timeline/data_providers/provider';

interface EventsTableProps {
  data: EventItem[];
  loading: boolean;
  startDate: number;
  endDate: number;
}

export const EventsTable = pure<EventsTableProps>(({ data, loading, startDate, endDate }) => (
  <BasicTable
    columns={getEventsColumns(startDate, endDate)}
    loading={loading}
    pageOfItems={data}
    sortField="host.hostname"
    title="Events"
  />
));

const getEventsColumns = (startDate: number, endDate: number) => [
  {
    name: 'Host name',
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: (item: EventItem) => {
      const hostName = getOr('--', 'host.hostname', item);
      return (
        <>
          <DraggableWrapper
            dataProvider={{
              enabled: true,
              id: `${item.event!.id}`,
              name: hostName,
              negated: false,
              componentResultParam: 'events',
              componentQuery: EventsQuery,
              componentQueryProps: {
                sourceId: 'default',
                startDate,
                endDate,
                filterQuery: `{"bool":{"should":[{"match":{"host.name":"${hostName}"}}],"minimum_should_match":1}}`,
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider
                    dataProvider={dataProvider}
                    onDataProviderRemoved={noop}
                    onToggleDataProviderEnabled={noop}
                  />
                </DragEffects>
              ) : (
                hostName
              )
            }
          />
        </>
      );
    },
  },
  {
    name: 'Event type',
    sortable: true,
    truncateText: true,
    hideForMobile: true,
    render: (item: EventItem) => (
      <ProviderContainer>{getOr('--', 'event.type', item)}</ProviderContainer>
    ),
  },
  {
    name: 'Source',
    truncateText: true,
    render: (item: EventItem) => (
      <>
        {getOr('--', 'source.ip', item).slice(0, 12)} : {getOr('--', 'source.port', item)}
      </>
    ),
  },
  {
    name: 'Destination',
    sortable: true,
    truncateText: true,
    render: (item: EventItem) => (
      <>
        {getOr('--', 'destination.ip', item).slice(0, 12)} : {getOr('--', 'destination.port', item)}
      </>
    ),
  },
  {
    name: 'Location',
    sortable: true,
    truncateText: true,
    render: (item: EventItem) => (
      <>
        {getOr('--', 'geo.region_name', item)} - {getOr('--', 'geo.country_iso_code', item)}
      </>
    ),
  },
];
