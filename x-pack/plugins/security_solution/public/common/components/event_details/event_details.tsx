/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent, EuiTabbedContentTab, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';
import { SummaryView } from './summary_view';
import { TimelineTabs } from '../../../../common/types/timeline';

export type View = EventsViewType.tableView | EventsViewType.jsonView | EventsViewType.summaryView;
export enum EventsViewType {
  tableView = 'table-view',
  jsonView = 'json-view',
  summaryView = 'summary-view',
}

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  id: string;
  isAlert: boolean;
  view: EventsViewType;
  onViewSelected: (selected: EventsViewType) => void;
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
    overflow: hidden;
  }
`;

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

const EventDetailsComponent: React.FC<Props> = ({
  browserFields,
  data,
  id,
  view,
  onViewSelected,
  timelineTabType,
  timelineId,
  isAlert,
}) => {
  const handleTabClick = useCallback((e) => onViewSelected(e.id), [onViewSelected]);

  const alerts = useMemo(
    () => [
      {
        id: EventsViewType.summaryView,
        name: i18n.SUMMARY,
        content: (
          <>
            <EuiSpacer size="l" />
            <SummaryView
              data={data}
              eventId={id}
              browserFields={browserFields}
              timelineId={timelineId}
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

  const selectedTab = useMemo(() => tabs.find((t) => t.id === view) ?? tabs[0], [tabs, view]);

  return (
    <StyledEuiTabbedContent
      data-test-subj="eventDetails"
      tabs={tabs}
      selectedTab={selectedTab}
      onTabClick={handleTabClick}
    />
  );
};

EventDetailsComponent.displayName = 'EventDetailsComponent';

export const EventDetails = React.memo(EventDetailsComponent);
