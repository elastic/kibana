/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';
import { COLLAPSE, COLLAPSE_EVENT } from '../../../timelines/components/timeline/body/translations';

export type View = 'table-view' | 'json-view';

const CollapseLink = styled(EuiLink)`
  margin: 20px 0;
`;

CollapseLink.displayName = 'CollapseLink';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  data: TimelineEventsDetailsItem[];
  id: string;
  view: View;
  onEventToggled: () => void;
  onUpdateColumns: OnUpdateColumns;
  onViewSelected: (selected: View) => void;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
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
    onEventToggled,
    onUpdateColumns,
    onViewSelected,
    timelineId,
    toggleColumn,
  }) => {
    const tabs: EuiTabbedContentTab[] = useMemo(
      () => [
        {
          id: 'table-view',
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
          id: 'json-view',
          name: i18n.JSON_VIEW,
          content: <JsonView data={data} />,
        },
      ],
      [browserFields, columnHeaders, data, id, onUpdateColumns, timelineId, toggleColumn]
    );

    return (
      <Details data-test-subj="eventDetails">
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={view === 'table-view' ? tabs[0] : tabs[1]}
          onTabClick={(e) => onViewSelected(e.id as View)}
        />
        <CollapseLink aria-label={COLLAPSE} data-test-subj="collapse" onClick={onEventToggled}>
          {COLLAPSE_EVENT}
        </CollapseLink>
      </Details>
    );
  }
);

EventDetails.displayName = 'EventDetails';
