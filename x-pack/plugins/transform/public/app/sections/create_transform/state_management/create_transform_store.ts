/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { bindActionCreators } from 'redux';

import { useToastNotifications } from '../../../app_dependencies';

import {
  getPivotConfigActions,
  usePivotConfigOptions,
} from '../components/step_define/hooks/use_pivot_config';

import { advancedPivotEditorSlice } from './advanced_pivot_editor_slice';
import { advancedRuntimeMappingsEditorSlice } from './advanced_runtime_mappings_editor_slice';
import { advancedSourceEditorSlice } from './advanced_source_editor_slice';
import { stepDefineSlice } from './step_define_slice';
import { stepDetailsSlice } from './step_details_slice';
import { stepCreateSlice } from './step_create_slice';
import { wizardSlice } from './wizard_slice';

// Because we get the redux store with a factory function we need to
// use these nested ReturnTypes to dynamically get the StoreState.
export type StoreState = ReturnType<ReturnType<typeof getTransformWizardStore>['getState']>;

export const getTransformWizardStore = () =>
  configureStore({
    reducer: {
      wizard: wizardSlice.reducer,
      stepDefine: stepDefineSlice.reducer,
      stepDetails: stepDetailsSlice.reducer,
      stepCreate: stepCreateSlice.reducer,
      advancedPivotEditor: advancedPivotEditorSlice.reducer,
      advancedRuntimeMappingsEditor: advancedRuntimeMappingsEditorSlice.reducer,
      advancedSourceEditor: advancedSourceEditorSlice.reducer,
    },
  });

export function useWizardActions() {
  const pivotConfigOptions = usePivotConfigOptions();
  const toastNotifications = useToastNotifications();
  const dispatch = useDispatch();
  return useMemo(
    () => ({
      ...bindActionCreators(
        {
          ...wizardSlice.actions,
          ...stepDefineSlice.actions,
          ...stepDetailsSlice.actions,
          ...stepCreateSlice.actions,
          ...advancedPivotEditorSlice.actions,
          ...advancedRuntimeMappingsEditorSlice.actions,
          ...advancedSourceEditorSlice.actions,
        },
        dispatch
      ),
      pivotConfig: bindActionCreators(
        getPivotConfigActions(pivotConfigOptions, toastNotifications),
        dispatch
      ),
    }),
    // Needs to be updated on a change of pivotConfigOptions, this will happen
    // when a users edits runtime mappings for example.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pivotConfigOptions]
  );
}

export function useWizardSelector<T>(selector: (s: StoreState) => T) {
  return useSelector<StoreState, T>(selector);
}
