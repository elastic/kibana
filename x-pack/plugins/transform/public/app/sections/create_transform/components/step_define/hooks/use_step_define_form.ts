/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';

import { getPreviewTransformRequestBody, getTransformConfigQuery } from '../../../../../common';

import { useAdvancedPivotEditor } from './use_advanced_pivot_editor';
import { useAdvancedSourceEditor } from './use_advanced_source_editor';
import { useDatePicker } from './use_date_picker';
import { useSearchBar } from './use_search_bar';
import { useLatestFunctionConfig } from './use_latest_function_config';
import { useWizardContext } from '../../wizard/wizard';
import {
  useCreateTransformWizardSelector,
  selectRequestPayload,
} from '../../../create_transform_store';
import { useAdvancedRuntimeMappingsEditor } from './use_advanced_runtime_mappings_editor';

export type StepDefineFormHook = ReturnType<typeof useStepDefineForm>;

export const useStepDefineForm = () => {
  const runtimeMappings = useCreateTransformWizardSelector((s) => s.stepDefine.runtimeMappings);

  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const datePicker = useDatePicker();
  const searchBar = useSearchBar();
  const requestPayload = useSelector(selectRequestPayload);

  const latestFunctionConfig = useLatestFunctionConfig();

  const transformConfigQuery = useCreateTransformWizardSelector((s) =>
    getTransformConfigQuery(s.stepDefine.searchQuery)
  );

  const previewRequest = getPreviewTransformRequestBody(
    dataView,
    transformConfigQuery,
    requestPayload,
    runtimeMappings
  );

  // pivot config hook
  const advancedPivotEditor = useAdvancedPivotEditor(previewRequest);

  // source config hook
  const advancedSourceEditor = useAdvancedSourceEditor(previewRequest);

  // runtime fields config hook
  const runtimeMappingsEditor = useAdvancedRuntimeMappingsEditor();

  return {
    advancedPivotEditor,
    advancedSourceEditor,
    runtimeMappingsEditor,
    datePicker,
    latestFunctionConfig,
    searchBar,
  };
};
