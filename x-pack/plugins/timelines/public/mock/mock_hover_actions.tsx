/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

/* eslint-disable react/display-name */
export const mockHoverActions = {
  addToTimeline: {
    AddToTimelineButton: () => <>{'Add To Timeline'}</>,
    keyboardShortcut: 'timelineAddShortcut',
    useGetHandleStartDragToTimeline: () => jest.fn(),
  },
  columnToggle: {
    ColumnToggleButton: () => <>{'Column Toggle'}</>,
    columnToggleFn: jest.fn(),
    keyboardShortcut: 'columnToggleShortcut',
  },
  copy: {
    CopyButton: () => <>{'Copy button'}</>,
    keyboardShortcut: 'copyShortcut',
  },
  filterForValue: {
    FilterForValueButton: () => <>{'Filter button'}</>,
    filterForValueFn: jest.fn(),
    keyboardShortcut: 'filterForShortcut',
  },
  filterOutValue: {
    FilterOutValueButton: () => <>{'Filter out button'}</>,
    filterOutValueFn: jest.fn(),
    keyboardShortcut: 'filterOutShortcut',
  },
};
