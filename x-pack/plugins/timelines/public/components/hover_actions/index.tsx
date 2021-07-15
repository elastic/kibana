/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
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
import { HoverActionComponentProps, FilterValueFnArgs } from './actions/types';

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
  AddToTimelineButton,
  keyboardShortcut: ADD_TO_TIMELINE_KEYBOARD_SHORTCUT,
  useGetHandleStartDragToTimeline,
};

export const columnToggle = {
  ColumnToggleButton,
  columnToggleFn,
  keyboardShortcut: COLUMN_TOGGLE_KEYBOARD_SHORTCUT,
};

export const copy = {
  CopyButton,
  keyboardShortcut: COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT,
};

export const filterForValue = {
  FilterForValueButton,
  filterForValueFn,
  keyboardShortcut: FILTER_FOR_VALUE_KEYBOARD_SHORTCUT,
};

export const filterOutValue = {
  FilterOutValueButton,
  filterOutValueFn,
  keyboardShortcut: FILTER_OUT_VALUE_KEYBOARD_SHORTCUT,
};
