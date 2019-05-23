/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { DetailItem } from '../../graphql/types';
import { OnUpdateColumns } from '../timeline/events';

import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';

export type View = 'table-view' | 'json-view';

interface Props {
  browserFields: BrowserFields;
  data: DetailItem[];
  id: string;
  isLoading: boolean;
  view: View;
  onUpdateColumns: OnUpdateColumns;
  onViewSelected: (selected: View) => void;
  timelineId: string;
}

const Details = styled.div`
  user-select: none;
  width: 100%;
`;

export const EventDetails = pure<Props>(
  ({ browserFields, data, id, isLoading, view, onUpdateColumns, onViewSelected, timelineId }) => {
    const tabs: EuiTabbedContentTab[] = [
      {
        id: 'table-view',
        name: i18n.TABLE,
        content: (
          <EventFieldsBrowser
            browserFields={browserFields}
            data={data}
            eventId={id}
            isLoading={isLoading}
            onUpdateColumns={onUpdateColumns}
            timelineId={timelineId}
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
          onTabClick={e => onViewSelected(e.id as View)}
        />
      </Details>
    );
  }
);
