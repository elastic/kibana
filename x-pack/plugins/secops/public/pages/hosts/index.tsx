/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getOr } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';

import { EventItem, KpiItem } from '../../../common/graphql/types';
import { BasicTable, Columns } from '../../components/basic_table';
import { HorizontalBarChart, HorizontalBarChartData } from '../../components/horizontal_bar_chart';
import { Pane1FlexContent } from '../../components/page';
import { Placeholders, VisualizationPlaceholder } from '../../components/visualization_placeholder';
import { EventsQuery } from '../../containers/events';

export const Hosts = pure(() => (
  <EventsQuery sourceId="default" startDate={1541044800000} endDate={1543640399999}>
    {({ events, kpiEventType, loading }) => (
      <Pane1FlexContent data-test-subj="pane1FlexContent">
        <VisualizationPlaceholder>
          <HorizontalBarChart
            loading={loading}
            title="KPI event types"
            width={490}
            height={279}
            barChartdata={
              kpiEventType.map((i: KpiItem) => ({
                x: i.count,
                y: i.value,
              })) as HorizontalBarChartData[]
            }
          />
        </VisualizationPlaceholder>
        <VisualizationPlaceholder>
          <BasicTable
            columns={eventsColumns}
            loading={loading}
            pageOfItems={events}
            sortField="host.hostname"
            title="Events"
          />
        </VisualizationPlaceholder>
        <Placeholders timelineId="pane2-timeline" count={8} myRoute="Hosts" />
      </Pane1FlexContent>
    )}
  </EventsQuery>
));

const eventsColumns: Columns[] = [
  {
    name: 'Host name',
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: (item: EventItem) => (
      <React.Fragment>{getOr('--', 'host.hostname', item)}</React.Fragment>
    ),
  },
  {
    name: 'Event type',
    sortable: true,
    truncateText: true,
    hideForMobile: true,
    render: (item: EventItem) => <React.Fragment>{getOr('--', 'event.type', item)}</React.Fragment>,
  },
  {
    name: 'Source',
    truncateText: true,
    render: (item: EventItem) => (
      <React.Fragment>
        {getOr('--', 'source.ip', item).slice(0, 12)} : {getOr('--', 'source.port', item)}
      </React.Fragment>
    ),
  },
  {
    name: 'Destination',
    sortable: true,
    truncateText: true,
    render: (item: EventItem) => (
      <React.Fragment>
        {getOr('--', 'destination.ip', item).slice(0, 12)} : {getOr('--', 'destination.port', item)}
      </React.Fragment>
    ),
  },
  {
    name: 'Location',
    sortable: true,
    truncateText: true,
    render: (item: EventItem) => (
      <React.Fragment>
        {getOr('--', 'geo.region_name', item)} - {getOr('--', 'geo.country_iso_code', item)}
      </React.Fragment>
    ),
  },
];
