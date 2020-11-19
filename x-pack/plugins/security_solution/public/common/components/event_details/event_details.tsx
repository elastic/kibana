/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';

export type View = EventsViewType.tableView | EventsViewType.jsonView;
export enum EventsViewType {
  tableView = 'table-view',
  jsonView = 'json-view',
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
  view: EventsViewType;
  onUpdateColumns: OnUpdateColumns;
  onViewSelected: (selected: EventsViewType) => void;
  timelineId: string;
}

const Details = styled.div`
  user-select: none;
`;

Details.displayName = 'Details';

export const EventDetails = React.memo<Props>(
  ({
    browserFields,
    columnHeaders,
    data,
    id,
    view,
    onUpdateColumns,
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
            <EventFieldsBrowser
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              data={data}
              eventId={id}
              onUpdateColumns={onUpdateColumns}
              timelineId={timelineId}
            />
          ),
        },
        {
          id: EventsViewType.jsonView,
          name: i18n.JSON_VIEW,
          content: <JsonView data={data} />,
        },
      ],
      [browserFields, columnHeaders, data, id, onUpdateColumns, timelineId]
    );

    return (
      <Details data-test-subj="eventDetails">
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={view === 'table-view' ? tabs[0] : tabs[1]}
          onTabClick={handleTabClick}
        />
      </Details>
    );
  }
);

EventDetails.displayName = 'EventDetails';
