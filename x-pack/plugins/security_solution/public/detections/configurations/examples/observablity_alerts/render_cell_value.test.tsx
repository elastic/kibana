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
import { TimelineNonEcsData } from '../../../../../common/search_strategy/timeline';
import { CellValueElementProps } from '../../../../timelines/components/timeline/cell_rendering';
import { DefaultCellRenderer } from '../../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { ColumnHeaderOptions } from '../../../../timelines/store/timeline/model';

import { RenderCellValue } from '.';

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

  test('it renders a custom alert status', () => {
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <RenderCellValue {...props} columnId="kibana.rac.alert.status" />
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="alert-status"]').exists()).toBe(true);
  });

  test('it renders a custom alert duration', () => {
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <RenderCellValue {...props} columnId="kibana.rac.alert.duration.us" />
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="alert-duration"]').exists()).toBe(true);
  });

  test('it renders a custom rule severity', () => {
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <RenderCellValue {...props} columnId="signal.rule.severity" />
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="rule-severity"]').exists()).toBe(true);
  });

  test('it renders a custom reason', () => {
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <RenderCellValue {...props} columnId="signal.reason" />
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="reason"]').exists()).toBe(true);
  });

  test('it forwards the `CellValueElementProps` to the `DefaultCellRenderer` for any other field', () => {
    const aRandomFieldName = 'a.random.field.name';
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <RenderCellValue {...props} columnId={aRandomFieldName} />
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find(DefaultCellRenderer).first().props()).toEqual({
      ...props,
      columnId: aRandomFieldName,
    });
  });
});
