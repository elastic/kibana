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

import { Draggable, Droppable } from 'react-beautiful-dnd';
import { EventItem, KpiItem } from '../../../common/graphql/types';
import { BasicTable } from '../../components/basic_table';
import { IdToDataProvider } from '../../components/data_provider_context';
import { HorizontalBarChart, HorizontalBarChartData } from '../../components/horizontal_bar_chart';
import { Pane1FlexContent } from '../../components/page';
import { DataProvider } from '../../components/timeline/data_providers/data_provider';
import {
  Placeholders,
  ProviderContainer,
  VisualizationPlaceholder,
} from '../../components/visualization_placeholder';
import { EventsQuery } from '../../containers/events';

// start/end date to show good alert in the timeline
const startDate = 1521830963132;
const endDate = 1521862432253;

// start/end date to show good data in the KPI event type
const startDate2 = 1541044800000;
const endDate2 = 1543640399999;

const ReactDndDropTarget = styled.div`
  :hover {
    background-color: rgb(217, 217, 217);
    color: rgb(0, 0, 0);
    border-radius: 4px;
    transition: background-color 0.5s ease;
  }
`; // required by react-beautiful-dnd

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
            <Placeholders timelineId="pane2-timeline" count={8} myRoute="Hosts" />
          </React.Fragment>
        )}
      </EventsQuery>
    </Pane1FlexContent>
  ))
);
const updateSessionStorage = (dataProvider: DataProvider): void => {
  const oldProviders: IdToDataProvider = JSON.parse(
    sessionStorage.getItem('dataProviders') || '{}'
  ) as IdToDataProvider;

  const newProviders = { ...oldProviders, [dataProvider.id]: dataProvider };
  sessionStorage.setItem('dataProviders', JSON.stringify(newProviders));
};
interface GetDraggableIdParams {
  dataProviderId: string;
}

const getDraggableId = ({ dataProviderId }: GetDraggableIdParams): string =>
  `draggableId.provider.${dataProviderId}`;

const getDroppableId = ({
  visualizationPlaceholderId,
}: {
  visualizationPlaceholderId: string;
}): string => `droppableId.provider.${visualizationPlaceholderId}`;

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
          <Droppable
            droppableId={getDroppableId({
              visualizationPlaceholderId: `hostname-${item.event!.id}`,
            })}
          >
            {droppableProvided => (
              <ReactDndDropTarget
                innerRef={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
              >
                <Draggable
                  draggableId={getDraggableId({ dataProviderId: `${item.event!.id}` })}
                  index={0}
                  key={'pane2-timeline'}
                >
                  {provided => (
                    <ProviderContainer
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      innerRef={provided.innerRef}
                      data-test-subj="providerContainer"
                    >
                      {updateSessionStorage({
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
                      })}
                      {hostName}
                    </ProviderContainer>
                  )}
                </Draggable>
              </ReactDndDropTarget>
            )}
          </Droppable>
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

const ProviderContainer = styled.div`
  user-select: none;
  cursor: grab;
`;
