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

import type { StepDefineExposedState } from '../components/step_define';
import type { StepDetailsExposedState } from '../components/step_details';

import {
  advancedPivotEditorSlice,
  type AdvancedPivotEditorState,
} from './advanced_pivot_editor_slice';
import {
  advancedRuntimeMappingsEditorSlice,
  type AdvancedRuntimeMappingsEditorState,
} from './advanced_runtime_mappings_editor_slice';
import { stepDefineSlice } from './step_define_slice';
import { stepDetailsSlice } from './step_details_slice';
import { wizardSlice, type WizardState } from './wizard_slice';

export interface StoreState {
  wizard: WizardState;
  stepDefine: StepDefineExposedState;
  stepDetails: StepDetailsExposedState | null;
  advancedPivotEditor: AdvancedPivotEditorState;
  advancedRuntimeMappingsEditor: AdvancedRuntimeMappingsEditorState;
}

export const getTransformWizardStore = () =>
  configureStore({
    reducer: {
      wizard: wizardSlice.reducer,
      stepDefine: stepDefineSlice.reducer,
      stepDetails: stepDetailsSlice.reducer,
      advancedPivotEditor: advancedPivotEditorSlice.reducer,
      advancedRuntimeMappingsEditor: advancedRuntimeMappingsEditorSlice.reducer,
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
          ...advancedPivotEditorSlice.actions,
          ...advancedRuntimeMappingsEditorSlice.actions,
        },
        dispatch
      ),
      pivotConfig: bindActionCreators(
        getPivotConfigActions(pivotConfigOptions, toastNotifications),
        dispatch
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

export function useWizardSelector<T>(selector: (s: StoreState) => T) {
  return useSelector<StoreState, T>(selector);
}
