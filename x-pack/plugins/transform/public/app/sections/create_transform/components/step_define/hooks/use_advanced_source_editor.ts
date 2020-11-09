/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { PostTransformsPreviewRequestSchema } from '../../../../../../../common/api_schemas/transforms';

import { StepDefineExposedState } from '../common';

export const useAdvancedSourceEditor = (
  defaults: StepDefineExposedState,
  previewRequest: PostTransformsPreviewRequestSchema
) => {
  const stringifiedSourceConfig = JSON.stringify(previewRequest.source.query, null, 2);

  // Advanced editor for source config state
  const [sourceConfigUpdated, setSourceConfigUpdated] = useState(defaults.sourceConfigUpdated);

  const [
    isAdvancedSourceEditorSwitchModalVisible,
    setAdvancedSourceEditorSwitchModalVisible,
  ] = useState(false);

  const [isAdvancedSourceEditorEnabled, setAdvancedSourceEditorEnabled] = useState(
    defaults.isAdvancedSourceEditorEnabled
  );

  const [
    isAdvancedSourceEditorApplyButtonEnabled,
    setAdvancedSourceEditorApplyButtonEnabled,
  ] = useState(false);

  const [
    advancedEditorSourceConfigLastApplied,
    setAdvancedEditorSourceConfigLastApplied,
  ] = useState(stringifiedSourceConfig);

  const [advancedEditorSourceConfig, setAdvancedEditorSourceConfig] = useState(
    stringifiedSourceConfig
  );

  const applyAdvancedSourceEditorChanges = () => {
    const sourceConfig = JSON.parse(advancedEditorSourceConfig);
    const prettySourceConfig = JSON.stringify(sourceConfig, null, 2);
    setSourceConfigUpdated(true);
    setAdvancedEditorSourceConfig(prettySourceConfig);
    setAdvancedEditorSourceConfigLastApplied(prettySourceConfig);
    setAdvancedSourceEditorApplyButtonEnabled(false);
  };

  // If switching to KQL after updating via editor - reset search
  const toggleAdvancedSourceEditor = (reset = false) => {
    if (reset === true) {
      setSourceConfigUpdated(false);
    }
    if (isAdvancedSourceEditorEnabled === false) {
      setAdvancedEditorSourceConfigLastApplied(advancedEditorSourceConfig);
    }

    setAdvancedSourceEditorEnabled(!isAdvancedSourceEditorEnabled);
    setAdvancedSourceEditorApplyButtonEnabled(false);
  };

  return {
    actions: {
      applyAdvancedSourceEditorChanges,
      setAdvancedSourceEditorApplyButtonEnabled,
      setAdvancedSourceEditorEnabled,
      setAdvancedEditorSourceConfig,
      setAdvancedEditorSourceConfigLastApplied,
      setAdvancedSourceEditorSwitchModalVisible,
      setSourceConfigUpdated,
      toggleAdvancedSourceEditor,
    },
    state: {
      advancedEditorSourceConfig,
      advancedEditorSourceConfigLastApplied,
      isAdvancedSourceEditorApplyButtonEnabled,
      isAdvancedSourceEditorEnabled,
      isAdvancedSourceEditorSwitchModalVisible,
      sourceConfigUpdated,
    },
  };
};
