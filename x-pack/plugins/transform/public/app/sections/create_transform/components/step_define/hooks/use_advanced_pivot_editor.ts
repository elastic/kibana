/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { XJsonMode } from '@kbn/ace';

import { XJson } from '../../../../../../../../../../src/plugins/es_ui_shared/public';

import { PostTransformsPreviewRequestSchema } from '../../../../../../../common/api_schemas/transforms';

import { StepDefineExposedState } from '../common';

const { useXJsonMode } = XJson;
const xJsonMode = new XJsonMode();

export const useAdvancedPivotEditor = (
  defaults: StepDefineExposedState,
  previewRequest: PostTransformsPreviewRequestSchema
) => {
  const stringifiedPivotConfig = JSON.stringify(previewRequest.pivot, null, 2);

  // Advanced editor for pivot config state
  const [isAdvancedEditorSwitchModalVisible, setAdvancedEditorSwitchModalVisible] = useState(false);

  const [
    isAdvancedPivotEditorApplyButtonEnabled,
    setAdvancedPivotEditorApplyButtonEnabled,
  ] = useState(false);

  const [isAdvancedPivotEditorEnabled, setAdvancedPivotEditorEnabled] = useState(
    defaults.isAdvancedPivotEditorEnabled
  );

  const [advancedEditorConfigLastApplied, setAdvancedEditorConfigLastApplied] = useState(
    stringifiedPivotConfig
  );

  const {
    convertToJson,
    setXJson: setAdvancedEditorConfig,
    xJson: advancedEditorConfig,
  } = useXJsonMode(stringifiedPivotConfig);

  useEffect(() => {
    setAdvancedEditorConfig(stringifiedPivotConfig);
  }, [setAdvancedEditorConfig, stringifiedPivotConfig]);

  const toggleAdvancedEditor = () => {
    setAdvancedEditorConfig(advancedEditorConfig);
    setAdvancedPivotEditorEnabled(!isAdvancedPivotEditorEnabled);
    setAdvancedPivotEditorApplyButtonEnabled(false);
    if (isAdvancedPivotEditorEnabled === false) {
      setAdvancedEditorConfigLastApplied(advancedEditorConfig);
    }
  };

  return {
    actions: {
      convertToJson,
      setAdvancedEditorConfig,
      setAdvancedEditorConfigLastApplied,
      setAdvancedEditorSwitchModalVisible,
      setAdvancedPivotEditorApplyButtonEnabled,
      setAdvancedPivotEditorEnabled,
      toggleAdvancedEditor,
    },
    state: {
      advancedEditorConfig,
      advancedEditorConfigLastApplied,
      isAdvancedEditorSwitchModalVisible,
      isAdvancedPivotEditorApplyButtonEnabled,
      isAdvancedPivotEditorEnabled,
      xJsonMode,
    },
  };
};
