/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { XJsonMode } from '@kbn/ace';
import { XJson } from '@kbn/es-ui-shared-plugin/public';

import {
  useCreateTransformWizardActions,
  useCreateTransformWizardSelector,
} from '../../../create_transform_store';

const { useXJsonMode } = XJson;
const xJsonMode = new XJsonMode();

export const useAdvancedRuntimeMappingsEditor = () => {
  const isRuntimeMappingsEditorEnabled = useCreateTransformWizardSelector(
    (s) => s.stepDefine.isRuntimeMappingsEditorEnabled
  );
  const runtimeMappings = useCreateTransformWizardSelector((s) => s.stepDefine.runtimeMappings);
  const { setRuntimeMappings, setRuntimeMappingsEditorEnabled, setRuntimeMappingsUpdated } =
    useCreateTransformWizardActions();

  const stringifiedRuntimeMappings = useMemo(
    () => JSON.stringify(runtimeMappings, null, 2),
    [runtimeMappings]
  );

  const [isRuntimeMappingsEditorSwitchModalVisible, setRuntimeMappingsEditorSwitchModalVisible] =
    useState(false);

  const [isRuntimeMappingsEditorApplyButtonEnabled, setRuntimeMappingsEditorApplyButtonEnabled] =
    useState(false);

  const [advancedEditorRuntimeMappingsLastApplied, setAdvancedEditorRuntimeMappingsLastApplied] =
    useState(stringifiedRuntimeMappings);

  const {
    convertToJson,
    setXJson: setAdvancedRuntimeMappingsConfig,
    xJson: advancedRuntimeMappingsConfig,
  } = useXJsonMode(stringifiedRuntimeMappings ?? '');

  const applyRuntimeMappingsEditorChanges = () => {
    const parsedRuntimeMappings =
      advancedRuntimeMappingsConfig === '' ? {} : JSON.parse(advancedRuntimeMappingsConfig);
    const prettySourceConfig = JSON.stringify(parsedRuntimeMappings, null, 2);
    setRuntimeMappingsUpdated(true);
    setRuntimeMappings(parsedRuntimeMappings);
    setAdvancedRuntimeMappingsConfig(prettySourceConfig);
    setAdvancedEditorRuntimeMappingsLastApplied(prettySourceConfig);
    setRuntimeMappingsEditorApplyButtonEnabled(false);
  };

  // If switching to KQL after updating via editor - reset search
  const toggleRuntimeMappingsEditor = (reset = false) => {
    if (reset === true) {
      setRuntimeMappingsUpdated(false);
      setAdvancedRuntimeMappingsConfig(advancedEditorRuntimeMappingsLastApplied);
    }
    setRuntimeMappingsEditorEnabled(!isRuntimeMappingsEditorEnabled);
    setRuntimeMappingsEditorApplyButtonEnabled(false);
  };

  return {
    actions: {
      applyRuntimeMappingsEditorChanges,
      setRuntimeMappingsEditorApplyButtonEnabled,
      setAdvancedEditorRuntimeMappingsLastApplied,
      setRuntimeMappingsEditorSwitchModalVisible,
      toggleRuntimeMappingsEditor,
      convertToJson,
      setAdvancedRuntimeMappingsConfig,
    },
    state: {
      advancedEditorRuntimeMappingsLastApplied,
      isRuntimeMappingsEditorApplyButtonEnabled,
      isRuntimeMappingsEditorSwitchModalVisible,
      advancedRuntimeMappingsConfig,
      xJsonMode,
    },
  };
};
