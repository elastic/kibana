/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC, type PropsWithChildren } from 'react';
import type { PayloadAction } from '@reduxjs/toolkit';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { useDispatch, Provider } from 'react-redux';
import { bindActionCreators } from 'redux';

import type { SignificantItem } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from '../../components/log_rate_analysis_results_table/types';

// Log Rate Analysis uses redux-toolkit to manage some of its state to avoid prop drilling.

type SignificantItemOrNull = SignificantItem | null;
type GroupOrNull = GroupTableItem | null;

function getDefaultState(): State {
  return {
    pinnedGroup: null,
    pinnedSignificantItem: null,
    selectedGroup: null,
    selectedSignificantItem: null,
    // Default to false for now, until page restructure work to enable smooth sticky histogram is done
    stickyHistogram: false,
  };
}

export interface State {
  pinnedGroup: GroupOrNull;
  pinnedSignificantItem: SignificantItemOrNull;
  selectedGroup: GroupOrNull;
  selectedSignificantItem: SignificantItemOrNull;
  stickyHistogram: boolean;
}

const logRateAnalysisSlice = createSlice({
  name: 'editTransformFlyout',
  initialState: getDefaultState(),
  reducers: {
    clearAllRowState: (state: State) => {
      state.pinnedGroup = null;
      state.pinnedSignificantItem = null;
      state.selectedGroup = null;
      state.selectedSignificantItem = null;
    },
    setPinnedGroup: (state: State, action: PayloadAction<GroupOrNull>) => {
      state.pinnedGroup = action.payload;
    },
    setPinnedSignificantItem: (state: State, action: PayloadAction<SignificantItemOrNull>) => {
      state.pinnedSignificantItem = action.payload;
    },
    setSelectedGroup: (state: State, action: PayloadAction<GroupOrNull>) => {
      state.selectedGroup = action.payload;
    },
    setSelectedSignificantItem: (state: State, action: PayloadAction<SignificantItemOrNull>) => {
      state.selectedSignificantItem = action.payload;
    },
    setStickyHistogram: (state: State, action: PayloadAction<boolean>) => {
      state.stickyHistogram = action.payload;
    },
  },
});

const getReduxStore = () =>
  configureStore({
    reducer: logRateAnalysisSlice.reducer,
  });

export const LogRateAnalysisReduxProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const store = useMemo(getReduxStore, []);
  return <Provider store={store}>{children}</Provider>;
};

export const useLogRateAnalysisReduxActions = () => {
  const dispatch = useDispatch();
  return useMemo(() => bindActionCreators(logRateAnalysisSlice.actions, dispatch), [dispatch]);
};
