/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiIcon, EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DataProvider } from '../data_providers/data_provider';
import { ECS } from '../ecs';
import { OnColumnSorted, OnDataProviderRemoved, OnFilterChange, OnRangeSelected } from '../events';
import { ColumnHeaders } from './column_headers';
import { ColumnHeader } from './column_headers/column_header';
import { ColumnRenderer, getColumnRenderer, getRowRenderer, RowRenderer } from './renderers';
import { Sort } from './sort';

interface Props {
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: ECS[];
  dataProviders: DataProvider[];
  height?: string;
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  rowRenderers: RowRenderer[];
  sort: Sort;
  width: number;
}

const BodyDiv = styled.div<{ width: string; height: string }>`
  display: flex;
  flex-direction: column;
  margin: 20px 5px 5px 8px;
  overflow: auto;
  width: ${props => props.width};
  height: ${props => props.height};
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
`;

const FlexRow = styled.span`
  display: flex;
  flex-direction: row;
`;

const Cell = styled(EuiText)`
  overflow: hidden;
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

const DataDrivenColumns = styled.div`
  display: flex;
  width: 100%;
`;

const ColumnRender = styled.div<{ minwidth: string; maxwidth: string }>`
  max-width: ${props => props.minwidth};
  min-width: ${props => props.maxwidth};
`;

const defaultHeight = '100%';

/** Renders the timeline body */
export const Body = pure<Props>(
  ({
    columnHeaders,
    columnRenderers,
    data,
    height = defaultHeight,
    onColumnSorted,
    onFilterChange,
    onRangeSelected,
    rowRenderers,
    sort,
    width,
  }) => (
    <BodyDiv data-test-subj="body" width={`${width - 10}px`} height={height}>
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
            {getRowRenderer(ecs, rowRenderers).renderRow(
              ecs,
              <FlexRow>
                <Pin type="pin" size="l" />
                <DataDrivenColumns data-test-subj="dataDrivenColumns">
                  {columnHeaders.map(header => (
                    <ColumnRender
                      key={`cell-${header.id}`}
                      data-test-subj="cellContainer"
                      maxwidth={`${header.minWidth}px`}
                      minwidth={`${header.minWidth}px`}
                    >
                      <Cell size="xs">
                        {getColumnRenderer(header.id, columnRenderers, ecs).renderColumn(
                          header.id,
                          ecs
                        )}
                      </Cell>
                    </ColumnRender>
                  ))}
                </DataDrivenColumns>
              </FlexRow>
            )}
          </Row>
        ))}
      </ScrollableArea>
    </BodyDiv>
  )
);
