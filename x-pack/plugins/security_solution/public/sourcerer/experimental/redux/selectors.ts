/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import type { SelectedDataView } from '../../store/model';
import { type State } from '../../../common/store/types';

/**
 * Compatibility layer / adapter for legacy selector consumers.
 * It is used in useSecuritySolutionDataView hook as alternative data source (behind a flag)
 */
export const sourcererAdapterSelector = createSelector(
  [(state: State) => state.dataViewPicker],
  (dataViewPicker): SelectedDataView => {
    return {
      loading: dataViewPicker.state === 'loading',
      dataViewId: dataViewPicker.dataView.id || '',
      patternList: dataViewPicker.patternList,
      indicesExist: true,
      browserFields: {},
      activePatterns: dataViewPicker.patternList,
      runtimeMappings: {},
      selectedPatterns: dataViewPicker.patternList,
      indexPattern: { fields: [], title: dataViewPicker.dataView.title || '' },
      sourcererDataView: {},
    };
  }
);
