/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiIcon, EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import moment from 'moment';
import { DataProvider } from '../data_providers/data_provider';
import { ECS } from '../ecs';
import { OnColumnSorted, OnDataProviderRemoved, OnFilterChange, OnRangeSelected } from '../events';
import { ColumnHeaders } from './column_headers';
import { ColumnHeader } from './column_headers/column_header';
import { Sort } from './sort';

interface Props {
  columnHeaders: ColumnHeader[];
  data: ECS[];
  dataProviders: DataProvider[];
  height?: number | string;
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  sort: Sort;
  width: number;
}

const BodyDiv = styled.div`
  display: flex;
  flex-direction: column;
  margin: 20px 5px 5px 8px;
  overflow: auto;
`;

const ScrollableArea = styled.div`
  height: 100%;
  overflow-y: scroll;
  margin-top: 5px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  padding: 0;
  min-height: 40px;
  cursor: pointer;
`;

const Transitionable = styled.span`
  display: flex;
  flex-direction: row;
  transition: 700ms background, 700ms border-color, 1s transform, 1s box-shadow;
  border-color: transparent;
  transition-delay: 0s;
  &:hover {
    background: #f0f8ff;
    border: 1px solid;
    border-color: #d9d9d9;
    transform: scale(1.025);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }
`;

const Cell = styled(EuiText)`
  overflow: hidden;
  min-width: 100px;
  max-width: 100px;
  margin-right: 6px;
`;

const TimeGutter = styled.span`
  min-width: 50px;
  background-color: #f2f2f2;
`;

const Pin = styled(EuiIcon)`
  min-width: 50px;
  margin-right: 8px;
  margin-top: 5px;
  transform: rotate(45deg);
  color: grey;
`;

const defaultHeight = '100%';

/** Renders the timeline body */
export const Body = pure<Props>(
  ({
    columnHeaders,
    data,
    height = defaultHeight,
    onColumnSorted,
    onFilterChange,
    onRangeSelected,
    sort,
    width,
  }) => (
    <BodyDiv data-test-subj="body" style={{ width: `${width - 10}px`, height }}>
      <ColumnHeaders
        columnHeaders={columnHeaders}
        onColumnSorted={onColumnSorted}
        onFilterChange={onFilterChange}
        onRangeSelected={onRangeSelected}
        sort={sort}
      />
      <EuiHorizontalRule margin="xs" />
      <ScrollableArea>
        {data.map(ecs => (
          <Row key={ecs._id}>
            <TimeGutter />
            <Transitionable>
              <Pin type="pin" size="l" />
              <Cell size="xs">{moment(ecs['@timestamp']).format('YYYY-MM-DD')}</Cell>
              <Cell size="xs">{ecs.event.severity}</Cell>
              <Cell size="xs">{ecs.event.category}</Cell>
              <Cell size="xs">{ecs.event.type}</Cell>
              <Cell size="xs">{ecs.event.module}</Cell>
              <Cell size="xs">{ecs.user.name}</Cell>
              <Cell size="xs">
                {ecs.event.severity} / {ecs.event.module} / {ecs.event.category}
              </Cell>
            </Transitionable>
          </Row>
        ))}
      </ScrollableArea>
    </BodyDiv>
  )
);
