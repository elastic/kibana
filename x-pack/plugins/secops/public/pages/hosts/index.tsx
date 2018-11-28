/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { Dispatch } from 'redux';
import styled from 'styled-components';

import { EventItem, KpiItem } from '../../../common/graphql/types';
import { BasicTable } from '../../components/basic_table';
import { DraggableWrapper } from '../../components/drag_and_drop/draggable_wrapper';
import { HorizontalBarChart, HorizontalBarChartData } from '../../components/horizontal_bar_chart';
import { Pane1FlexContent } from '../../components/page';
import {
  Placeholders,
  ProviderContainer,
  VisualizationPlaceholder,
} from '../../components/visualization_placeholder';
import { EventsQuery } from '../../containers/events';

// TODO: wire up the date picker to remove this hard-coded start/end date, which shows a good alert in the timeline
const startDate = 1521830963132;
const endDate = 1521862432253;

// TODO: wire up the date picker to remove this hard-coded start/end date, which shows a good data for the KPI event type
const startDate2 = 1541044800000;
const endDate2 = 1543640399999;

interface Props {
  dispatch: Dispatch;
}

export const Hosts = connect()(
  pure<Props>(({ dispatch }) => (
    <Pane1FlexContent data-test-subj="pane1FlexContent">
      <EventsQuery sourceId="default" startDate={startDate2} endDate={endDate2}>
        {({ events, kpiEventType, loading }) => (
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
        )}
      </EventsQuery>
      <EventsQuery sourceId="default" startDate={startDate} endDate={endDate}>
        {({ events, kpiEventType, loading }) => (
          <React.Fragment>
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
                columns={getEventsColumns(dispatch)}
                loading={loading}
                pageOfItems={events}
                sortField="host.hostname"
                title="Events"
              />
            </VisualizationPlaceholder>
            <Placeholders count={8} myRoute="Hosts" />
          </React.Fragment>
        )}
      </EventsQuery>
    </Pane1FlexContent>
  ))
);

const EventColumns = styled.div``;

const getEventsColumns = (dispatch: Dispatch) => [
  {
    name: 'Host name',
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: (item: EventItem) => {
      const hostName = getOr('--', 'host.hostname', item);
      return (
        <EventColumns>
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
            render={() => hostName}
          />
        </EventColumns>
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
