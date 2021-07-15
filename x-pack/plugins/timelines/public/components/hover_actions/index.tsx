/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy, Suspense } from 'react';
import {
  AddToTimelineButton,
  ADD_TO_TIMELINE_KEYBOARD_SHORTCUT,
  UseGetHandleStartDragToTimelineArgs,
  useGetHandleStartDragToTimeline,
} from './actions/add_to_timeline';
import {
  ColumnToggleButton,
  columnToggleFn,
  ColumnToggleFnArgs,
  ColumnToggleProps,
  COLUMN_TOGGLE_KEYBOARD_SHORTCUT,
} from './actions/column_toggle';
import { CopyButton, CopyProps, COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT } from './actions/copy';
import {
  FilterForValueButton,
  filterForValueFn,
  FilterForValueProps,
  FILTER_FOR_VALUE_KEYBOARD_SHORTCUT,
} from './actions/filter_for_value';
import {
  FilterOutValueButton,
  filterOutValueFn,
  FILTER_OUT_VALUE_KEYBOARD_SHORTCUT,
} from './actions/filter_out_value';
import { HoverActionComponentProps, FilterValueFnArgs } from './actions/types';

const AddToTimelineButtonLazy = lazy(() =>
  import('./actions/add_to_timeline').then((module) => ({ default: module.AddToTimelineButton }))
);
const AddToTimelineSuspense = (props: HoverActionComponentProps) => (
  <Suspense fallback={null}>
    <AddToTimelineButtonLazy {...props} />
  </Suspense>
);

const ColumnToggleButtonLazy = lazy(() =>
  import('./actions/column_toggle').then((module) => ({ default: module.ColumnToggleButton }))
);
const ColumnToggleButtonSuspense = (props: ColumnToggleProps) => (
  <Suspense fallback={null}>
    <ColumnToggleButtonLazy {...props} />
  </Suspense>
);

const CopyButtonLazy = lazy(() =>
  import('./actions/copy').then((module) => ({ default: module.CopyButton }))
);
const CopyButtonSuspense = (props: CopyProps) => (
  <Suspense fallback={null}>
    <CopyButtonLazy {...props} />
  </Suspense>
);

const FilterForValueButtonLazy = lazy(() =>
  import('./actions/filter_for_value').then((module) => ({ default: module.FilterForValueButton }))
);
const FilterForValueButtonSuspense = (props: FilterForValueProps) => (
  <Suspense fallback={null}>
    <FilterForValueButtonLazy {...props} />
  </Suspense>
);

const FilterOutValueButtonLazy = lazy(() =>
  import('./actions/filter_out_value').then((module) => ({ default: module.FilterOutValueButton }))
);
const FilterOutValueButtonSuspense = (props: HoverActionComponentProps) => (
  <Suspense fallback={null}>
    <FilterOutValueButtonLazy {...props} />
  </Suspense>
);

export interface HoverActionsConfig {
  addToTimeline: {
    AddToTimelineButton: React.FC<HoverActionComponentProps>;
    keyboardShortcut: string;
    useGetHandleStartDragToTimeline: (args: UseGetHandleStartDragToTimelineArgs) => () => void;
  };
  columnToggle: {
    ColumnToggleButton: React.FC<ColumnToggleProps>;
    columnToggleFn: (args: ColumnToggleFnArgs) => void;
    keyboardShortcut: string;
  };
  copy: {
    CopyButton: React.FC<CopyProps>;
    keyboardShortcut: string;
  };
  filterForValue: {
    FilterForValueButton: React.FC<FilterForValueProps>;
    filterForValueFn: (args: FilterValueFnArgs) => void;
    keyboardShortcut: string;
  };
  filterOutValue: {
    FilterOutValueButton: React.FC<HoverActionComponentProps>;
    filterOutValueFn: (args: FilterValueFnArgs) => void;
    keyboardShortcut: string;
  };
}

export const addToTimeline = {
  AddToTimelineButton: AddToTimelineSuspense,
  keyboardShortcut: ADD_TO_TIMELINE_KEYBOARD_SHORTCUT,
  useGetHandleStartDragToTimeline,
};

export const columnToggle = {
  ColumnToggleButton: ColumnToggleButtonSuspense,
  columnToggleFn,
  keyboardShortcut: COLUMN_TOGGLE_KEYBOARD_SHORTCUT,
};

export const copy = {
  CopyButton: CopyButtonSuspense,
  keyboardShortcut: COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT,
};

export const filterForValue = {
  FilterForValueButton: FilterForValueButtonSuspense,
  filterForValueFn,
  keyboardShortcut: FILTER_FOR_VALUE_KEYBOARD_SHORTCUT,
};

export const filterOutValue = {
  FilterOutValueButton: FilterOutValueButtonSuspense,
  filterOutValueFn,
  keyboardShortcut: FILTER_OUT_VALUE_KEYBOARD_SHORTCUT,
};
