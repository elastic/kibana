/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { columnRenderers } from '../body/renderers';
import { getColumnRenderer } from '../body/renderers/get_column_renderer';
import { DragDropContextWrapper } from '../../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { DroppableWrapper } from '../../../../common/components/drag_and_drop/droppable_wrapper';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../../common/mock';
import { DefaultCellRenderer } from './default_cell_renderer';

jest.mock('../body/renderers/get_column_renderer');
const getColumnRendererMock = getColumnRenderer as jest.Mock;
const mockImplementation = {
  renderColumn: jest.fn(),
};

describe('DefaultCellRenderer', () => {
  const columnId = 'signal.rule.risk_score';
  const eventId = '_id-123';
  const isDetails = true;
  const isExpandable = true;
  const isExpanded = true;
  const linkValues = ['foo', 'bar', '@baz'];
  const rowIndex = 3;
  const setCellProps = jest.fn();
  const timelineId = 'test';

  beforeEach(() => {
    jest.clearAllMocks();
    getColumnRendererMock.mockImplementation(() => mockImplementation);
  });

  test('it invokes `getColumnRenderer` with the expected arguments', () => {
    const data = cloneDeep(mockTimelineData[0].data);
    const header = cloneDeep(defaultHeaders[0]);

    mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <DroppableWrapper droppableId="testing">
            <DefaultCellRenderer
              columnId={columnId}
              data={data}
              eventId={eventId}
              header={header}
              isDetails={isDetails}
              isExpandable={isExpandable}
              isExpanded={isExpanded}
              linkValues={linkValues}
              rowIndex={rowIndex}
              setCellProps={setCellProps}
              timelineId={timelineId}
            />
          </DroppableWrapper>
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(getColumnRenderer).toBeCalledWith(header.id, columnRenderers, data);
  });

  test('it invokes `renderColumn` with the expected arguments', () => {
    const data = cloneDeep(mockTimelineData[0].data);
    const header = cloneDeep(defaultHeaders[0]);

    mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <DroppableWrapper droppableId="testing">
            <DefaultCellRenderer
              columnId={columnId}
              data={data}
              eventId={eventId}
              header={header}
              isDetails={isDetails}
              isExpandable={isExpandable}
              isExpanded={isExpanded}
              linkValues={linkValues}
              rowIndex={rowIndex}
              setCellProps={setCellProps}
              timelineId={timelineId}
            />
          </DroppableWrapper>
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(mockImplementation.renderColumn).toBeCalledWith({
      columnName: header.id,
      eventId,
      field: header,
      linkValues,
      timelineId,
      truncate: true,
      values: ['2018-11-05T19:03:25.937Z'],
    });
  });
});
