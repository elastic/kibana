/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiSuperSelect,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnColumnRemoved, OnColumnResized, OnColumnSorted, OnFilterChange } from '../../events';
import { Sort } from '../sort';

import { ColumnHeader } from './column_header';
import { EventsSelect } from './events_select';
import { Header } from './header';

const ActionsContainer = styled.div<{ actionsColumnWidth: number }>`
  overflow: hidden;
  width: ${({ actionsColumnWidth }) => actionsColumnWidth}px;
`;

interface Props {
  actionsColumnWidth: number;
  columnHeaders: ColumnHeader[];
  isLoading: boolean;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  sort: Sort;
  timelineId: string;
  minWidth: number;
}

const ColumnHeadersContainer = styled.div<{
  minWidth: number;
}>`
  display: block;
  overflow: hidden;
  min-width: ${({ minWidth }) => `${minWidth}px`};
  margin-bottom: 2px;
`;

const EventsSelectContainer = styled(EuiFlexItem)`
  margin-right: 4px;
`;

/** Renders the timeline header columns */
export const ColumnHeaders = pure<Props>(
  ({
    actionsColumnWidth,
    columnHeaders,
    isLoading,
    onColumnRemoved,
    onColumnResized,
    onColumnSorted,
    onFilterChange = noop,
    sort,
    timelineId,
    minWidth,
  }) => (
    <ColumnHeadersContainer data-test-subj="column-headers" minWidth={minWidth}>
      <EuiFlexGroup data-test-subj="column-headers-group" gutterSize="none">
        <EuiFlexItem data-test-subj="actions-item" grow={false}>
          <ActionsContainer
            actionsColumnWidth={actionsColumnWidth}
            data-test-subj="actions-container"
          >
            <EuiFlexGroup gutterSize="none">
              <EventsSelectContainer grow={false}>
                <EventsSelect checkState="unchecked" timelineId={timelineId} />
              </EventsSelectContainer>
              <EuiFlexItem grow={true}>
                <EuiSuperSelect data-test-subj="field-browser" isLoading={false} onChange={noop} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </ActionsContainer>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="headers-item" grow={false}>
          <EuiFlexGroup data-test-subj="headers-group" gutterSize="none">
            {columnHeaders.map(header => (
              <EuiFlexItem grow={false} key={header.id}>
                <Header
                  timelineId={timelineId}
                  header={header}
                  isLoading={isLoading}
                  onColumnRemoved={onColumnRemoved}
                  onColumnResized={onColumnResized}
                  onColumnSorted={onColumnSorted}
                  onFilterChange={onFilterChange}
                  sort={sort}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ColumnHeadersContainer>
  )
);
