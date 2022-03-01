/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React, { useEffect } from 'react';

import { StatefulCell } from './stateful_cell';
import { getMappedNonEcsValue } from '.';
import { defaultHeaders } from '../../../../mock/header';
import {
  CellValueElementProps,
  ColumnHeaderOptions,
  TimelineTabs,
} from '../../../../../common/types/timeline';
import { TimelineNonEcsData } from '../../../../../common/search_strategy';
import { mockTimelineData } from '../../../../mock/mock_timeline_data';

/**
 * This (test) component implement's `EuiDataGrid`'s `renderCellValue` interface,
 * as documented here: https://elastic.github.io/eui/#/tabular-content/data-grid
 *
 * Its `CellValueElementProps` props are a superset of `EuiDataGridCellValueElementProps`.
 * The `setCellProps` function, defined by the `EuiDataGridCellValueElementProps` interface,
 * is typically called in a `useEffect`, as illustrated by `EuiDataGrid`'s code sandbox example:
 * https://codesandbox.io/s/zhxmo
 */
const RenderCellValue: React.FC<CellValueElementProps> = ({ columnId, data, setCellProps }) => {
  useEffect(() => {
    // branching logic that conditionally renders a specific cell green:
    if (columnId === defaultHeaders[0].id) {
      const value = getMappedNonEcsValue({
        data,
        fieldName: columnId,
      });

      if (value?.length) {
        setCellProps({
          style: {
            backgroundColor: 'green',
          },
        });
      }
    }
  }, [columnId, data, setCellProps]);

  return (
    <div data-test-subj="renderCellValue">
      {getMappedNonEcsValue({
        data,
        fieldName: columnId,
      })}
    </div>
  );
};

describe('StatefulCell', () => {
  const rowIndex = 123;
  const colIndex = 0;
  const eventId = '_id-123';
  const linkValues = ['foo', 'bar', '@baz'];
  const tabType = TimelineTabs.query;
  const timelineId = 'test';

  let header: ColumnHeaderOptions;
  let data: TimelineNonEcsData[];
  beforeEach(() => {
    data = cloneDeep(mockTimelineData[0].data);
    header = cloneDeep(defaultHeaders[0]);
  });

  test('it invokes renderCellValue with the expected arguments when tabType is specified', () => {
    const renderCellValue = jest.fn();

    mount(
      <StatefulCell
        rowIndex={rowIndex}
        colIndex={colIndex}
        data={data}
        header={header}
        eventId={eventId}
        linkValues={linkValues}
        renderCellValue={renderCellValue}
        tabType={TimelineTabs.query}
        timelineId={timelineId}
      />
    );

    expect(renderCellValue).toBeCalledWith(
      expect.objectContaining({
        columnId: header.id,
        eventId,
        data,
        header,
        isExpandable: true,
        isExpanded: false,
        isDetails: false,
        linkValues,
        rowIndex,
        colIndex,
        timelineId: `${timelineId}-${tabType}`,
      })
    );
  });

  test('it invokes renderCellValue with the expected arguments when tabType is NOT specified', () => {
    const renderCellValue = jest.fn();

    mount(
      <StatefulCell
        rowIndex={rowIndex}
        colIndex={colIndex}
        data={data}
        header={header}
        eventId={eventId}
        linkValues={linkValues}
        renderCellValue={renderCellValue}
        timelineId={timelineId}
      />
    );

    expect(renderCellValue).toBeCalledWith(
      expect.objectContaining({
        columnId: header.id,
        eventId,
        data,
        header,
        isExpandable: true,
        isExpanded: false,
        isDetails: false,
        linkValues,
        rowIndex,
        colIndex,
        timelineId,
      })
    );
  });

  test('it renders the React.Node returned by renderCellValue', () => {
    const renderCellValue = () => <div data-test-subj="renderCellValue" />;

    const wrapper = mount(
      <StatefulCell
        rowIndex={rowIndex}
        colIndex={colIndex}
        data={data}
        header={header}
        eventId={eventId}
        linkValues={linkValues}
        renderCellValue={renderCellValue}
        timelineId={timelineId}
      />
    );

    expect(wrapper.find('[data-test-subj="renderCellValue"]').exists()).toBe(true);
  });

  test("it renders a div with the styles set by `renderCellValue`'s `setCellProps` argument", () => {
    const wrapper = mount(
      <StatefulCell
        rowIndex={rowIndex}
        colIndex={colIndex}
        data={data}
        header={header}
        eventId={eventId}
        linkValues={linkValues}
        renderCellValue={RenderCellValue}
        timelineId={timelineId}
      />
    );

    expect(
      wrapper.find('[data-test-subj="statefulCell"]').getDOMNode().getAttribute('style')
    ).toEqual('background-color: green;');
  });
});
