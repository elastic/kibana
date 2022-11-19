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
    columnId: 'test-columnId',
    columnValues: 'test-columnValues',
    checked: false,
    onRowSelected: jest.fn(),
    eventId: 'test-event-id',
    loadingEventIds: [],
    onEventDetailsPanelOpened: jest.fn(),
    showCheckboxes: true,
    data: [],
    ecsData: {
      _id: 'test-ecsData-id',
    },
    index: 1,
    rowIndex: 1,
    showNotes: true,
    timelineId: 'test-timelineId',
    setEventsLoading: jest.fn(),
    setEventsDeleted: jest.fn(),
  };
  test('displays loader when id is included on loadingEventIds', () => {
    const res = transformControlColumns(defaultProps);
    expect(res.find).not.toBeNull();
  });
});
