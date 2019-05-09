/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DetailItem } from '../../graphql/types';

import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';

export type View = 'table-view' | 'json-view';

interface Props {
  data: DetailItem[];
  id: string;
  view: View;
  onViewSelected: (selected: View) => void;
}

const Details = styled.div`
  user-select: none;
  width: 100%;
`;

export const EventDetails = pure<Props>(({ data, id, view, onViewSelected }) => {
  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'table-view',
      name: i18n.TABLE,
      content: <EventFieldsBrowser data={data} eventId={id} />,
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
});
