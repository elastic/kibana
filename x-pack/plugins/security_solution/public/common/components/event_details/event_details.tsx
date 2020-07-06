/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { DetailItem } from '../../../graphql/types';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';

export type View = 'table-view' | 'json-view';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  data: DetailItem[];
  id: string;
  view: View;
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
    onUpdateColumns,
    onViewSelected,
    timelineId,
    toggleColumn,
  }) => {
    const tabs: EuiTabbedContentTab[] = [
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
    ];

    return (
      <Details data-test-subj="eventDetails">
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={view === 'table-view' ? tabs[0] : tabs[1]}
          onTabClick={(e) => onViewSelected(e.id as View)}
        />
      </Details>
    );
  }
);

EventDetails.displayName = 'EventDetails';
