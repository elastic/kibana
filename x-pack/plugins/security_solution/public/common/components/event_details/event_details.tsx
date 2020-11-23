/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { get } from 'lodash/fp';
import { BrowserFields } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';
import { SummaryView } from './summary_view';

export type View = EventsViewType.tableView | EventsViewType.jsonView | EventsViewType.summaryView;
export enum EventsViewType {
  tableView = 'table-view',
  jsonView = 'json-view',
  summaryView = 'summary-view',
}

const CollapseLink = styled(EuiLink)`
  margin: 20px 0;
`;

CollapseLink.displayName = 'CollapseLink';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  data: TimelineEventsDetailsItem[];
  id: string;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

const Details = styled.div`
  user-select: none;
`;

Details.displayName = 'Details';

export const EventDetails = React.memo<Props>(
  ({ browserFields, columnHeaders, data, id, onUpdateColumns, timelineId, toggleColumn }) => {
    const eventKindData = useMemo(() => (data || []).find((item) => item.field === 'event.kind'), [
      data,
    ]);
    const eventKind = get('values.0', eventKindData);
    const [view, setView] = useState<View>(EventsViewType.tableView);
    const handleTabClick = useCallback((e) => setView(e.id), [setView]);

    const alerts = useMemo(
      () => [
        {
          id: EventsViewType.summaryView,
          name: i18n.SUMMARY,
          content: (
            <SummaryView
              data={data}
              eventId={id}
              browserFields={browserFields}
              timelineId={timelineId}
            />
          ),
        },
      ],
      [data, id, browserFields, timelineId]
    );
    const tabs: EuiTabbedContentTab[] = useMemo(
      () => [
        ...(eventKind !== 'event' ? alerts : []),
        {
          id: EventsViewType.tableView,
          name: i18n.TABLE,
          content: (
            <EventFieldsBrowser
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              data={data}
              eventId={id}
              onUpdateColumns={onUpdateColumns}
              timelineId={timelineId}
              toggleColumn={toggleColumn}
            />
          ),
        },
        {
          id: EventsViewType.jsonView,
          name: i18n.JSON_VIEW,
          content: <JsonView data={data} />,
        },
      ],
      [
        browserFields,
        columnHeaders,
        data,
        id,
        onUpdateColumns,
        timelineId,
        toggleColumn,
        alerts,
        eventKind,
      ]
    );

    useEffect(() => {
      if (data != null && eventKind !== 'event') {
        setView(EventsViewType.summaryView);
      }
    }, [data, eventKind]);

    const selectedTab = useMemo(() => tabs.find((tab) => tab.id === view), [tabs, view]);

    return (
      <Details data-test-subj="eventDetails">
        <EuiTabbedContent tabs={tabs} selectedTab={selectedTab} onTabClick={handleTabClick} />
      </Details>
    );
  }
);

EventDetails.displayName = 'EventDetails';
