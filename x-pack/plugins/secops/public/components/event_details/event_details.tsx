/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import { ECS } from '../timeline/ecs';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';

export type View = 'table-view' | 'json-view';

interface Props {
  data: ECS;
  view: View;
  onViewSelected: (selected: View) => void;
}

const Details = styled.div`
  user-select: none;
  width: 100%;
`;

export const EventDetails = pure<Props>(({ data, view, onViewSelected }) => {
  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'table-view',
      name: 'Table',
      content: <EventFieldsBrowser data={data} />,
    },
    {
      id: 'json-view',
      name: 'JSON View',
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
