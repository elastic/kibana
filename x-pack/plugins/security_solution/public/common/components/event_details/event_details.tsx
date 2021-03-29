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
import { SummaryView, SummaryViewProps } from './summary_view';
import { TimelineTabs } from '../../../../common/types/timeline';

export type EventView =
  | EventsViewType.tableView
  | EventsViewType.jsonView
  | EventsViewType.summaryView;
export type ThreatView = EventsViewType.threatSummaryView | EventsViewType.threatInfoView;
export enum EventsViewType {
  tableView = 'table-view',
  jsonView = 'json-view',
  summaryView = 'summary-view',
  threatSummaryView = 'threat-summary-view',
  threatInfoView = 'threat-info-view',
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
  }
`;

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

const getSummaryTab = (id: string, name: string, props: SummaryViewProps) => ({
  id,
  name,
  content: (
    <>
      <EuiSpacer size="l" />
      <SummaryView {...props} />
    </>
  ),
});

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
      getSummaryTab(EventsViewType.summaryView, i18n.SUMMARY, {
        data,
        eventId: id,
        browserFields,
        timelineId,
      }),
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
      !!data.find((item) => item.field === 'threat.indicator'),
    [tabs, selectedEventTab, isAlert, data]
  );

  const threatTabs: EuiTabbedContentTab[] = useMemo(() => {
    const defaultProps = { data, eventId: id, timelineId };
    return isAlert && isThreatPresent
      ? [
          getSummaryTab(EventsViewType.threatSummaryView, i18n.THREAT_SUMMARY, {
            ...defaultProps,
            isDisplayingThreatSummary: true,
          }),
          getSummaryTab(EventsViewType.threatInfoView, i18n.THREAT_INFO, {
            ...defaultProps,
            isDisplayingThreatInfo: true,
          }),
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
      />
      {isThreatPresent && (
        <StyledEuiTabbedContent
          data-test-subj="threatDetails"
          tabs={threatTabs}
          selectedTab={selectedThreatTab}
          onTabClick={handleThreatTabClick}
        />
      )}
    </>
  );
};

EventDetailsComponent.displayName = 'EventDetailsComponent';

export const EventDetails = React.memo(EventDetailsComponent);
