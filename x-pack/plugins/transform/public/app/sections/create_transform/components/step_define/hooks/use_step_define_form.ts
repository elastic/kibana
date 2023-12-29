/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { getPreviewTransformRequestBody } from '../../../../../common';

import { useAdvancedSourceEditor } from './use_advanced_source_editor';
import { useDatePicker } from './use_date_picker';
import { useSearchBar } from './use_search_bar';
import { useLatestFunctionConfig } from './use_latest_function_config';
import { useWizardActions } from '../../../state_management/create_transform_store';
import { useWizardContext } from '../../wizard/wizard';
import { useWizardSelector } from '../../../state_management/create_transform_store';
import {
  selectRequestPayload,
  selectTransformConfigQuery,
} from '../../../state_management/step_define_selectors';
import { useAdvancedRuntimeMappingsEditor } from './use_advanced_runtime_mappings_editor';

export type StepDefineFormHook = ReturnType<typeof useStepDefineForm>;

export const useStepDefineForm = () => {
  const runtimeMappings = useWizardSelector((s) => s.stepDefine.runtimeMappings);

  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const datePicker = useDatePicker();
  const searchBar = useSearchBar();

  const requestPayload = useSelector(selectRequestPayload);
  const transformConfigQuery = useSelector(selectTransformConfigQuery);
  const isAdvancedPivotEditorEnabled = useWizardSelector(
    (s) => s.advancedPivotEditor.isAdvancedPivotEditorEnabled
  );
  const { setAdvancedEditorConfig, setAdvancedEditorConfigLastApplied } = useWizardActions();

  const latestFunctionConfig = useLatestFunctionConfig();

  const previewRequest = useMemo(
    () =>
      getPreviewTransformRequestBody(
        dataView,
        transformConfigQuery,
        requestPayload,
        runtimeMappings
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transformConfigQuery, requestPayload, runtimeMappings]
  );

  useEffect(() => {
    if (!isAdvancedPivotEditorEnabled) {
      const stringifiedPivotConfig = JSON.stringify(previewRequest.pivot, null, 2);
      setAdvancedEditorConfigLastApplied(stringifiedPivotConfig);
      setAdvancedEditorConfig(stringifiedPivotConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdvancedPivotEditorEnabled, previewRequest]);

  // source config hook
  const advancedSourceEditor = useAdvancedSourceEditor(previewRequest);

  // runtime fields config hook
  const runtimeMappingsEditor = useAdvancedRuntimeMappingsEditor();

  return {
    advancedSourceEditor,
    runtimeMappingsEditor,
    datePicker,
    latestFunctionConfig,
    searchBar,
  };
};
