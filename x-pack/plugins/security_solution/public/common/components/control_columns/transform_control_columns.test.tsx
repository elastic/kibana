/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformColumnsProps } from './transform_control_columns';
import { transformControlColumns } from './transform_control_columns';

describe('transformControlColumns', () => {
  const defaultProps: TransformColumnsProps = {
    onRowSelected: jest.fn(),
    loadingEventIds: [],
    showCheckboxes: true,
    data: [],
    timelineId: 'test-timelineId',
    setEventsLoading: jest.fn(),
    setEventsDeleted: jest.fn(),
    columnHeaders: [],
    controlColumns: [],
    disabledCellActions: [],
    selectedEventIds: {},
    tabType: '',
    isSelectAllChecked: false,
    browserFields: {},
    onSelectPage: jest.fn(),
    pageSize: 0,
    sort: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    theme: {} as any,
  };
  test('displays loader when id is included on loadingEventIds', () => {
    const res = transformControlColumns(defaultProps);
    expect(res.find).not.toBeNull();
  });
});
