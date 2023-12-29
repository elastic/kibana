/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { getPreviewTransformRequestBody } from '../../../../../common';

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

export type StepDefineFormHook = ReturnType<typeof useStepDefineForm>;

export const useStepDefineForm = () => {
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const datePicker = useDatePicker();
  const searchBar = useSearchBar();

  const requestPayload = useSelector(selectRequestPayload);
  const transformConfigQuery = useSelector(selectTransformConfigQuery);
  const isAdvancedPivotEditorEnabled = useWizardSelector(
    (s) => s.advancedPivotEditor.isAdvancedPivotEditorEnabled
  );
  const isAdvancedSourceEditorEnabled = useWizardSelector(
    (s) => s.advancedSourceEditor.isAdvancedSourceEditorEnabled
  );
  const isRuntimeMappingsEditorEnabled = useWizardSelector(
    (s) => s.advancedRuntimeMappingsEditor.isRuntimeMappingsEditorEnabled
  );
  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);
  const {
    setAdvancedEditorConfig,
    setAdvancedEditorConfigLastApplied,
    setAdvancedRuntimeMappingsConfig,
    setAdvancedRuntimeMappingsConfigLastApplied,
    setAdvancedSourceEditorConfig,
    setAdvancedSourceEditorConfigLastApplied,
  } = useWizardActions();

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

  useEffect(() => {
    if (!isAdvancedSourceEditorEnabled) {
      const stringifiedSourceConfigUpdate = JSON.stringify(previewRequest.source.query, null, 2);

      setAdvancedSourceEditorConfigLastApplied(stringifiedSourceConfigUpdate);
      setAdvancedSourceEditorConfig(stringifiedSourceConfigUpdate);
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [isAdvancedSourceEditorEnabled]);

  useEffect(() => {
    if (!isRuntimeMappingsEditorEnabled) {
      const stringifiedRuntimeMappings = JSON.stringify(runtimeMappings, null, 2);
      setAdvancedRuntimeMappingsConfigLastApplied(stringifiedRuntimeMappings);
      setAdvancedRuntimeMappingsConfig(stringifiedRuntimeMappings);
    }
  }, [isRuntimeMappingsEditorEnabled, runtimeMappings]);

  return {
    datePicker,
    latestFunctionConfig,
    searchBar,
  };
};
