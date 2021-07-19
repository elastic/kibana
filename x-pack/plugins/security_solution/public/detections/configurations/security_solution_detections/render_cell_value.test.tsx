/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { ColumnHeaderOptions } from '../../../../common';
import { mockBrowserFields } from '../../../common/containers/source/mock';
import { DragDropContextWrapper } from '../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../common/mock';
import { TimelineNonEcsData } from '../../../../common/search_strategy/timeline';
import { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';

import { RenderCellValue } from '.';

jest.mock('../../../common/lib/kibana');

describe('RenderCellValue', () => {
  const columnId = '@timestamp';
  const eventId = '_id-123';
  const linkValues = ['foo', 'bar', '@baz'];
  const rowIndex = 5;
  const timelineId = 'test';

  let data: TimelineNonEcsData[];
  let header: ColumnHeaderOptions;
  let props: CellValueElementProps;

  beforeEach(() => {
    data = cloneDeep(mockTimelineData[0].data);
    header = cloneDeep(defaultHeaders[0]);
    props = {
      columnId,
      data,
      eventId,
      header,
      isDetails: false,
      isExpandable: false,
      isExpanded: false,
      linkValues,
      rowIndex,
      setCellProps: jest.fn(),
      timelineId,
    };
  });

  test('it forwards the `CellValueElementProps` to the `DefaultCellRenderer`', () => {
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <RenderCellValue {...props} />
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find(DefaultCellRenderer).first().props()).toEqual(props);
  });
});
