/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';
import { deleteMonitorAction } from '../actions/delete_monitor';

export interface DeleteMonitorState {
  error?: Record<string, Error | undefined>;
  loading?: string[];
  deletedMonitorIds?: string[];
}

export const initialState: DeleteMonitorState = {
  error: {},
  loading: [],
  deletedMonitorIds: [],
};

export const deleteMonitorReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(
      String(deleteMonitorAction.get),
      (
        state: WritableDraft<DeleteMonitorState>,
        action: PayloadAction<{ id: string; name: string }>
      ) => ({
        ...state,
        loading: [...(state.loading ?? []), action.payload.id],
        error: { ...state.error, [action.payload.id]: undefined },
      })
    )
    .addCase(
      String(deleteMonitorAction.success),
      (state: WritableDraft<DeleteMonitorState>, action: PayloadAction<string>) => ({
        ...state,
        loading: state.loading?.filter((id) => id !== action.payload),
        deletedMonitorIds: [...(state.deletedMonitorIds ?? []), action.payload],
      })
    )
    .addCase(
      String(deleteMonitorAction.fail),
      (
        state: WritableDraft<DeleteMonitorState>,
        action: PayloadAction<{ id: string; error: Error }>
      ) => ({
        ...state,
        loading: state.loading?.filter((id) => id !== action.payload.id),
        error: { ...state.error, [action.payload.id]: action.payload.error },
      })
    );
});
