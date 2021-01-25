/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { getPreviewTransformRequestBody } from '../../../../../common';

import { getDefaultStepDefineState } from '../common';

import { StepDefineFormProps } from '../step_define_form';

import { useAdvancedPivotEditor } from './use_advanced_pivot_editor';
import { useAdvancedSourceEditor } from './use_advanced_source_editor';
import { usePivotConfig } from './use_pivot_config';
import { useSearchBar } from './use_search_bar';
import { useLatestFunctionConfig } from './use_latest_function_config';
import { TRANSFORM_FUNCTION } from '../../../../../../../common/constants';

export type StepDefineFormHook = ReturnType<typeof useStepDefineForm>;

export const useStepDefineForm = ({ overrides, onChange, searchItems }: StepDefineFormProps) => {
  const defaults = { ...getDefaultStepDefineState(searchItems), ...overrides };
  const { indexPattern } = searchItems;

  const [transformFunction, setTransformFunction] = useState(defaults.transformFunction);

  const searchBar = useSearchBar(defaults, indexPattern);
  const pivotConfig = usePivotConfig(defaults, indexPattern);
  const latestFunctionConfig = useLatestFunctionConfig(defaults.latestConfig, indexPattern);

  const previewRequest = getPreviewTransformRequestBody(
    indexPattern.title,
    searchBar.state.pivotQuery,
    pivotConfig.state.requestPayload
  );

  // pivot config hook
  const advancedPivotEditor = useAdvancedPivotEditor(defaults, previewRequest);

  // source config hook
  const advancedSourceEditor = useAdvancedSourceEditor(defaults, previewRequest);

  useEffect(() => {
    if (!advancedSourceEditor.state.isAdvancedSourceEditorEnabled) {
      const previewRequestUpdate = getPreviewTransformRequestBody(
        indexPattern.title,
        searchBar.state.pivotQuery,
        pivotConfig.state.requestPayload
      );

      const stringifiedSourceConfigUpdate = JSON.stringify(
        previewRequestUpdate.source.query,
        null,
        2
      );

      advancedSourceEditor.actions.setAdvancedEditorSourceConfig(stringifiedSourceConfigUpdate);
    }

    onChange({
      transformFunction,
      latestConfig: latestFunctionConfig.config,
      aggList: pivotConfig.state.aggList,
      groupByList: pivotConfig.state.groupByList,
      isAdvancedPivotEditorEnabled: advancedPivotEditor.state.isAdvancedPivotEditorEnabled,
      isAdvancedSourceEditorEnabled: advancedSourceEditor.state.isAdvancedSourceEditorEnabled,
      searchLanguage: searchBar.state.searchLanguage,
      searchString: searchBar.state.searchString,
      searchQuery: searchBar.state.searchQuery,
      sourceConfigUpdated: advancedSourceEditor.state.sourceConfigUpdated,
      valid:
        transformFunction === TRANSFORM_FUNCTION.PIVOT
          ? pivotConfig.state.validationStatus.isValid
          : latestFunctionConfig.validationStatus.isValid,
      validationStatus:
        transformFunction === TRANSFORM_FUNCTION.PIVOT
          ? pivotConfig.state.validationStatus
          : latestFunctionConfig.validationStatus,
      previewRequest:
        transformFunction === TRANSFORM_FUNCTION.PIVOT
          ? pivotConfig.state.requestPayload
          : latestFunctionConfig.requestPayload,
    });
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    JSON.stringify(advancedPivotEditor.state),
    JSON.stringify(advancedSourceEditor.state),
    pivotConfig.state,
    JSON.stringify(searchBar.state),
    latestFunctionConfig.config,
    transformFunction,
    /* eslint-enable react-hooks/exhaustive-deps */
  ]);

  return {
    transformFunction,
    setTransformFunction,
    advancedPivotEditor,
    advancedSourceEditor,
    pivotConfig,
    latestFunctionConfig,
    searchBar,
  };
};
