/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';

export type View = EventsViewType.tableView | EventsViewType.jsonView;
export enum EventsViewType {
  tableView = 'table-view',
  jsonView = 'json-view',
}

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  id: string;
  view: EventsViewType;
  onViewSelected: (selected: EventsViewType) => void;
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

const EventDetailsComponent: React.FC<Props> = ({
  browserFields,
  data,
  id,
  view,
  onViewSelected,
  timelineId,
}) => {
  const handleTabClick = useCallback((e) => onViewSelected(e.id as EventsViewType), [
    onViewSelected,
  ]);

  const tabs: EuiTabbedContentTab[] = useMemo(
    () => [
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
            <JsonView data={data} />
          </>
        ),
      },
    ],
    [browserFields, data, id, timelineId]
  );

  const selectedTab = view === EventsViewType.tableView ? tabs[0] : tabs[1];

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
