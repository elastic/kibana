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
import { BrowserFields } from '@kbn/timelines-plugin/common/search_strategy';
import { Ecs } from '../../../../../common/ecs';

jest.mock('../../../../common/lib/kibana');

jest.mock('../body/renderers/get_column_renderer');
const getColumnRendererMock = getColumnRenderer as jest.Mock;
const mockImplementation = {
  renderColumn: jest.fn(),
};

describe('DefaultCellRenderer', () => {
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
            <DefaultCellRenderer
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
            <DefaultCellRenderer
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

  test('if in tgrid expanded value, it renders ExpandedCellValueActions', () => {
    const data = cloneDeep(mockTimelineData[0].data);
    const header = cloneDeep(defaultHeaders[1]);
    const isDetails = true;
    const id = 'event.severity';
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <DroppableWrapper droppableId="testing">
            <DefaultCellRenderer
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
    ).toBeTruthy();
  });
});

describe('host link rendering', () => {
  const data = cloneDeep(mockTimelineData[0].data);
  const hostNameHeader = cloneDeep(defaultHeaders[4]);

  beforeEach(() => {
    const { getColumnRenderer: realGetColumnRenderer } = jest.requireActual(
      '../body/renderers/get_column_renderer'
    );

    getColumnRendererMock.mockImplementation(realGetColumnRenderer); // link rendering tests must use the real renderer
  });

  test('it renders a link button for `host.name` when `isTimeline` is true', () => {
    const id = 'host.name';
    const isTimeline = true;

    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <DroppableWrapper droppableId="testing">
            <DefaultCellRenderer
              browserFields={undefined}
              columnId={id}
              ecsData={undefined}
              data={data}
              eventId="_id-123"
              header={hostNameHeader}
              isDetails={false}
              isDraggable={true}
              isExpandable={false}
              isExpanded={false}
              isTimeline={isTimeline}
              linkValues={[]}
              rowIndex={3}
              colIndex={0}
              setCellProps={jest.fn()}
              timelineId={'timeline-1-query'}
            />
          </DroppableWrapper>
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="host-details-button"]').first().text()).toEqual('apache');
  });

  test('it does NOT render a link button for `host.name` when `isTimeline` is false', () => {
    const id = 'host.name';
    const isTimeline = false;

    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <DroppableWrapper droppableId="testing">
            <DefaultCellRenderer
              browserFields={undefined}
              columnId={id}
              ecsData={undefined}
              data={data}
              eventId="_id-123"
              header={hostNameHeader}
              isDetails={false}
              isDraggable={true}
              isExpandable={false}
              isExpanded={false}
              isTimeline={isTimeline}
              linkValues={[]}
              rowIndex={3}
              colIndex={0}
              setCellProps={jest.fn()}
              timelineId={'timeline-1-query'}
            />
          </DroppableWrapper>
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="host-details-button"]').exists()).toBe(false);
  });

  test('it does NOT render a link button for non-host fields when `isTimeline` is true', () => {
    const id = '@timestamp'; // a non-host field
    const isTimeline = true;
    const timestampHeader = cloneDeep(defaultHeaders[0]);

    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <DroppableWrapper droppableId="testing">
            <DefaultCellRenderer
              browserFields={undefined}
              columnId={id}
              ecsData={undefined}
              data={data}
              eventId="_id-123"
              header={timestampHeader}
              isDetails={false}
              isDraggable={true}
              isExpandable={false}
              isExpanded={false}
              isTimeline={isTimeline}
              linkValues={[]}
              rowIndex={3}
              colIndex={0}
              setCellProps={jest.fn()}
              timelineId={'timeline-1-query'}
            />
          </DroppableWrapper>
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="host-details-button"]').exists()).toBe(false);
  });
});
