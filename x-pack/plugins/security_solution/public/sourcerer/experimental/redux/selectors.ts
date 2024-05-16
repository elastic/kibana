/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import type { SelectedDataView } from '../../store/model';
import { type RootState } from './store';

/**
 * Compatibility layer / adapter for legacy selector consumers.
 * It is used in useSecuritySolutionDataView hook as alternative data source (behind a flag)
 */
export const sourcererAdapterSelector = createSelector(
  [(state: RootState) => state],
  (state): SelectedDataView => {
    return {
      loading: state.state === 'loading',
      dataViewId: state.dataView.id || '',
      patternList: state.patternList,
      indicesExist: true,
      browserFields: {},
      activePatterns: state.patternList,
      runtimeMappings: {},
      selectedPatterns: state.patternList,
      indexPattern: { fields: [], title: state.dataView.title || '' },
      sourcererDataView: {},
    };
  }
);
