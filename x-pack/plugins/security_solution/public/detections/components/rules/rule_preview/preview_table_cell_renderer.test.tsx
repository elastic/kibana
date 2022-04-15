/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { DragDropContextWrapper } from '../../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../../common/mock';
import { PreviewTableCellRenderer } from './preview_table_cell_renderer';
import { getColumnRenderer } from '../../../../timelines/components/timeline/body/renderers/get_column_renderer';
import { DroppableWrapper } from '../../../../common/components/drag_and_drop/droppable_wrapper';
import { BrowserFields } from '../../../../../../timelines/common/search_strategy';
import { Ecs } from '../../../../../common/ecs';
import { columnRenderers } from '../../../../timelines/components/timeline/body/renderers';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../timelines/components/timeline/body/renderers/get_column_renderer');

const getColumnRendererMock = getColumnRenderer as jest.Mock;
const mockImplementation = {
  renderColumn: jest.fn(),
};

describe('PreviewTableCellRenderer', () => {
  const columnId = '@timestamp';
  const eventId = '_id-123';
  const isExpandable = true;
  const isExpanded = true;
  const linkValues = ['foo', 'bar', '@baz'];
  const rowIndex = 3;
  const colIndex = 0;
  const setCellProps = jest.fn();
  const timelineId = 'test';
  const ecsData = {} as Ecs;
  const browserFields = {} as BrowserFields;

  beforeEach(() => {
    jest.clearAllMocks();
    getColumnRendererMock.mockImplementation(() => mockImplementation);
  });

  test('it invokes `getColumnRenderer` with the expected arguments', () => {
    const data = cloneDeep(mockTimelineData[0].data);
    const header = cloneDeep(defaultHeaders[0]);
    const isDetails = true;

    mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <DroppableWrapper droppableId="testing">
            <PreviewTableCellRenderer
              browserFields={browserFields}
              columnId={columnId}
              data={data}
              ecsData={ecsData}
              eventId={eventId}
              header={header}
              isDetails={isDetails}
              isDraggable={true}
              isExpandable={isExpandable}
              isExpanded={isExpanded}
              linkValues={linkValues}
              rowIndex={rowIndex}
              colIndex={colIndex}
              setCellProps={setCellProps}
              timelineId={timelineId}
            />
          </DroppableWrapper>
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(getColumnRenderer).toBeCalledWith(header.id, columnRenderers, data);
  });

  test('if in tgrid expanded value, it invokes `renderColumn` with the expected arguments', () => {
    const data = cloneDeep(mockTimelineData[0].data);
    const header = cloneDeep(defaultHeaders[0]);
    const isDetails = true;
    const truncate = isDetails ? false : true;

    mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <DroppableWrapper droppableId="testing">
            <PreviewTableCellRenderer
              browserFields={browserFields}
              columnId={columnId}
              data={data}
              ecsData={ecsData}
              eventId={eventId}
              header={header}
              isDetails={isDetails}
              isDraggable={true}
              isExpandable={isExpandable}
              isExpanded={isExpanded}
              linkValues={linkValues}
              rowIndex={rowIndex}
              colIndex={colIndex}
              setCellProps={setCellProps}
              timelineId={timelineId}
              truncate={truncate}
            />
          </DroppableWrapper>
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(mockImplementation.renderColumn).toBeCalledWith({
      asPlainText: false,
      columnName: header.id,
      ecsData,
      eventId,
      field: header,
      isDetails,
      isDraggable: true,
      linkValues,
      rowRenderers: undefined,
      timelineId,
      truncate,
      values: ['2018-11-05T19:03:25.937Z'],
    });
  });

  test('if in tgrid expanded value, it does not render any actions', () => {
    const data = cloneDeep(mockTimelineData[0].data);
    const header = cloneDeep(defaultHeaders[1]);
    const isDetails = true;
    const id = 'event.severity';
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <DroppableWrapper droppableId="testing">
            <PreviewTableCellRenderer
              browserFields={browserFields}
              columnId={id}
              ecsData={ecsData}
              data={data}
              eventId={eventId}
              header={header}
              isDetails={isDetails}
              isDraggable={true}
              isExpandable={isExpandable}
              isExpanded={isExpanded}
              linkValues={linkValues}
              rowIndex={rowIndex}
              colIndex={colIndex}
              setCellProps={setCellProps}
              timelineId={timelineId}
            />
          </DroppableWrapper>
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="data-grid-expanded-cell-value-actions"]').exists()
    ).toBeFalsy();
  });
});
