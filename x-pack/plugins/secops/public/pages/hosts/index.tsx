/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, isUndefined } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { Dispatch } from 'redux';
import styled from 'styled-components';
import chrome from 'ui/chrome';

import { EventItem, KpiItem } from '../../../common/graphql/types';
import { BasicTable } from '../../components/basic_table';
import { DraggableWrapper } from '../../components/drag_and_drop/draggable_wrapper';
import { EmptyPage } from '../../components/empty_page';
import { HorizontalBarChart, HorizontalBarChartData } from '../../components/horizontal_bar_chart';
import { Pane1FlexContent } from '../../components/page';
import {
  Placeholders,
  ProviderContainer,
  VisualizationPlaceholder,
} from '../../components/visualization_placeholder';
import { EventsQuery } from '../../containers/events';
import { WithSource } from '../../containers/source';

const basePath = chrome.getBasePath();

// TODO: wire up the date picker to remove the hard-coded start/end dates, which show good data for the KPI event type
const startDate = 1521830963132;
const endDate = 1521862432253;

interface Props {
  dispatch: Dispatch;
}

export const Hosts = connect()(
  pure<Props>(({ dispatch }) => (
    <WithSource sourceId="default">
      {({ auditbeatIndicesExist }) =>
        auditbeatIndicesExist || isUndefined(auditbeatIndicesExist) ? (
          <EventsQuery sourceId="default" startDate={startDate} endDate={endDate}>
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
                    columns={getEventsColumns(dispatch)}
                    loading={loading}
                    pageOfItems={events}
                    sortField="host.hostname"
                    title="Events"
                  />
                </VisualizationPlaceholder>
                <Placeholders count={8} myRoute="Hosts" />
              </Pane1FlexContent>
            )}
          </EventsQuery>
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
