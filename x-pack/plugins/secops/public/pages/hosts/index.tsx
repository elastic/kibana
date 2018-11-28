/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiText } from '@elastic/eui';
import { getOr, isUndefined } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { Dispatch } from 'redux';
import styled from 'styled-components';
import chrome from 'ui/chrome';

import { EventItem, KpiItem } from '../../../common/graphql/types';
import { BasicTable } from '../../components/basic_table';
import { EmptyPage } from '../../components/empty_page';
import { HorizontalBarChart, HorizontalBarChartData } from '../../components/horizontal_bar_chart';
import { Pane1FlexContent } from '../../components/page';
import { Placeholders, VisualizationPlaceholder } from '../../components/visualization_placeholder';
import { EventsQuery } from '../../containers/events';
import { WithSource } from '../../containers/source';
import { timelineActions } from '../../store';

const basePath = chrome.getBasePath();

// start/end date to show good alert in the timeline
const startDate = 1521830963132;
const endDate = 1521862432253;

// start/end date to show good data in the KPI event type
// const startDate = 1541044800000;
// const endDate = 1543640399999;

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
                <Placeholders timelineId="timeline" count={8} myRoute="Hosts" />
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

const getEventsColumns = (dispatch: Dispatch) => [
  {
    name: 'Host name',
    sortable: true,
    truncateText: false,
    hideForMobile: false,
    render: (item: EventItem) => {
      const hostName = getOr('--', 'host.hostname', item);
      return (
        <ProviderContainer
          onClick={() => {
            dispatch(
              timelineActions.addProvider({
                id: 'timeline',
                provider: {
                  enabled: true,
                  id: `id-${hostName}`,
                  name,
                  negated: false,
                  componentResultParam: 'events',
                  componentQuery: EventsQuery,
                  componentQueryProps: {
                    sourceId: 'default',
                    startDate,
                    endDate,
                    filterQuery: `{"bool":{"should":[{"match":{"host.name":"${hostName}"}}],"minimum_should_match":1}}`,
                  },
                  render: () => (
                    <div data-test-subj="mockDataProvider">
                      <EuiBadge color="primary">n/a</EuiBadge>
                      <Text> {hostName} </Text>
                    </div>
                  ),
                },
              })
            );
          }}
        >
          {hostName}
        </ProviderContainer>
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

const Text = styled(EuiText)`
  display: inline;
  padding-left: 5px;
`;
