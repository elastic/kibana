/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiTabbedContentTab, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';
import { AlertSummaryView } from './alert_summary_view';
import { ThreatSummaryView } from './threat_summary_view';
import { ThreatDetailsView } from './threat_details_view';
import { TimelineTabs } from '../../../../common/types/timeline';
import { INDICATOR_DESTINATION_PATH } from '../../../../common/constants';

export type EventView =
  | EventsViewType.tableView
  | EventsViewType.jsonView
  | EventsViewType.summaryView;
export type ThreatView = EventsViewType.threatSummaryView | EventsViewType.threatDetailsView;
export enum EventsViewType {
  tableView = 'table-view',
  jsonView = 'json-view',
  summaryView = 'summary-view',
  threatSummaryView = 'threat-summary-view',
  threatDetailsView = 'threat-details-view',
}

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  id: string;
  isAlert: boolean;
  eventView: EventView;
  threatView: ThreatView;
  onEventViewSelected: (selected: EventView) => void;
  onThreatViewSelected: (selected: ThreatView) => void;
  timelineTabType: TimelineTabs | 'flyout';
  timelineId: string;
}

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  > [role='tabpanel'] {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: scroll;
    ::-webkit-scrollbar {
      -webkit-appearance: none;
      width: 7px;
    }
    ::-webkit-scrollbar-thumb {
      border-radius: 4px;
      background-color: rgba(0, 0, 0, 0.5);
      -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
    }
  }
`;

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

const EventDetailsComponent: React.FC<Props> = ({
  browserFields,
  data,
  eventView,
  id,
  isAlert,
  onEventViewSelected,
  onThreatViewSelected,
  threatView,
  timelineId,
  timelineTabType,
}) => {
  const handleEventTabClick = useCallback((e) => onEventViewSelected(e.id), [onEventViewSelected]);
  const handleThreatTabClick = useCallback((e) => onThreatViewSelected(e.id), [
    onThreatViewSelected,
  ]);

  const alerts = useMemo(
    () => [
      {
        id: EventsViewType.summaryView,
        name: i18n.SUMMARY,
        content: (
          <>
            <EuiSpacer size="l" />
            <AlertSummaryView
              {...{
                data,
                eventId: id,
                browserFields,
                timelineId,
              }}
            />
          </>
        ),
      },
    ],
    [data, id, browserFields, timelineId]
  );
  const tabs: EuiTabbedContentTab[] = useMemo(
    () => [
      ...(isAlert ? alerts : []),
      {
        id: EventsViewType.tableView,
        name: i18n.TABLE,
        content: (
          <>
            <EuiSpacer size="l" />
            <EventFieldsBrowser
              browserFields={browserFields}
              data={data}
              eventId={id}
              timelineId={timelineId}
              timelineTabType={timelineTabType}
            />
          </>
        ),
      },
      {
        id: EventsViewType.jsonView,
        'data-test-subj': 'jsonViewTab',
        name: i18n.JSON_VIEW,
        content: (
          <>
            <EuiSpacer size="m" />
            <TabContentWrapper>
              <JsonView data={data} />
            </TabContentWrapper>
          </>
        ),
      },
    ],
    [alerts, browserFields, data, id, isAlert, timelineId, timelineTabType]
  );

  const selectedEventTab = useMemo(() => tabs.find((t) => t.id === eventView) ?? tabs[0], [
    tabs,
    eventView,
  ]);

  const isThreatPresent: boolean = useMemo(
    () =>
      selectedEventTab.id === tabs[0].id &&
      isAlert &&
      data.some((item) => item.field === INDICATOR_DESTINATION_PATH),
    [tabs, selectedEventTab, isAlert, data]
  );

  const threatTabs: EuiTabbedContentTab[] = useMemo(() => {
    return isAlert && isThreatPresent
      ? [
          {
            id: EventsViewType.threatSummaryView,
            name: i18n.THREAT_SUMMARY,
            content: <ThreatSummaryView {...{ data, eventId: id, timelineId }} />,
          },
          {
            id: EventsViewType.threatDetailsView,
            name: i18n.THREAT_DETAILS,
            content: <ThreatDetailsView data={data} />,
          },
        ]
      : [];
  }, [data, id, isAlert, timelineId, isThreatPresent]);

  const selectedThreatTab = useMemo(
    () => threatTabs.find((t) => t.id === threatView) ?? threatTabs[0],
    [threatTabs, threatView]
  );

  return (
    <>
      <StyledEuiTabbedContent
        data-test-subj="eventDetails"
        tabs={tabs}
        selectedTab={selectedEventTab}
        onTabClick={handleEventTabClick}
        key="event-summary-tabs"
      />
      {isThreatPresent && (
        <StyledEuiTabbedContent
          data-test-subj="threatDetails"
          tabs={threatTabs}
          selectedTab={selectedThreatTab}
          onTabClick={handleThreatTabClick}
          key="threat-summary-tabs"
        />
      )}
    </>
  );
};

EventDetailsComponent.displayName = 'EventDetailsComponent';

export const EventDetails = React.memo(EventDetailsComponent);
