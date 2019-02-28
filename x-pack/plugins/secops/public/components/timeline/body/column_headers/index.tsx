/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnColumnSorted, OnFilterChange } from '../../events';
import { Sort } from '../sort';

import { ColumnHeader } from './column_header';
import { EventsSelect } from './events_select';
import { Header } from './header';

const SettingsContainer = styled.div`
  height: 24px;
  width: 24px;
`;

const EventsSelectAndSettingsContainer = styled.div<{ actionsColumnWidth: number }>`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-right: 5px;
  padding-right: 5px;
  width: ${({ actionsColumnWidth }) => actionsColumnWidth}px;
`;

interface Props {
  actionsColumnWidth: number;
  columnHeaders: ColumnHeader[];
  onColumnSorted?: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  sort: Sort;
  timelineId: string;
}

/** Renders the timeline header columns */
export const ColumnHeaders = pure<Props>(
  ({
    actionsColumnWidth,
    columnHeaders,
    onColumnSorted = noop,
    onFilterChange = noop,
    sort,
    timelineId,
  }) => (
    <EuiFlexGroup data-test-subj="column-headers" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EventsSelectAndSettingsContainer
          actionsColumnWidth={actionsColumnWidth}
          data-test-subj="events-select-and-settings-container"
        >
          <EventsSelect checkState="unchecked" timelineId={timelineId} />
          <SettingsContainer data-test-subj="settings-container">
            <EuiIcon data-test-subj="gear" type="gear" size="l" onClick={noop} />
          </SettingsContainer>
        </EventsSelectAndSettingsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiFlexGroup gutterSize="none">
          {columnHeaders.map(header => (
            <EuiFlexItem key={header.id}>
              <Header
                header={header}
                onColumnSorted={onColumnSorted}
                onFilterChange={onFilterChange}
                sort={sort}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);
