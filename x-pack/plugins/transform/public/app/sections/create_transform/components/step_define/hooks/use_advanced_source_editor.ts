/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { PostTransformsPreviewRequestSchema } from '../../../../../../../common/api_schemas/transforms';

import { getPreviewTransformRequestBody, getTransformConfigQuery } from '../../../../../common';

import {
  selectRequestPayload,
  useCreateTransformWizardActions,
  useCreateTransformWizardSelector,
} from '../../../create_transform_store';

import { useWizardContext } from '../../wizard/wizard';

export const useAdvancedSourceEditor = (previewRequest: PostTransformsPreviewRequestSchema) => {
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const requestPayload = useSelector(selectRequestPayload);

  const stringifiedSourceConfig = JSON.stringify(previewRequest.source.query, null, 2);

  const { setAdvancedSourceEditorEnabled, setSourceConfigUpdated } =
    useCreateTransformWizardActions();
  const isAdvancedSourceEditorEnabled = useCreateTransformWizardSelector(
    (s) => s.stepDefine.isAdvancedSourceEditorEnabled
  );
  const transformConfigQuery = useCreateTransformWizardSelector((s) =>
    getTransformConfigQuery(s.stepDefine.searchQuery)
  );
  const runtimeMappings = useCreateTransformWizardSelector((s) => s.stepDefine.runtimeMappings);
  const runtimeMappingsUpdated = useCreateTransformWizardSelector(
    (s) => s.stepDefine.runtimeMappingsUpdated
  );
  const isRuntimeMappingsEditorEnabled = useCreateTransformWizardSelector(
    (s) => s.stepDefine.isRuntimeMappingsEditorEnabled
  );

  const [isAdvancedSourceEditorSwitchModalVisible, setAdvancedSourceEditorSwitchModalVisible] =
    useState(false);

  const [isAdvancedSourceEditorApplyButtonEnabled, setAdvancedSourceEditorApplyButtonEnabled] =
    useState(false);

  const [advancedEditorSourceConfigLastApplied, setAdvancedEditorSourceConfigLastApplied] =
    useState(stringifiedSourceConfig);

  const [advancedEditorSourceConfig, setAdvancedEditorSourceConfig] =
    useState(stringifiedSourceConfig);

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

  useEffect(() => {
    if (!isAdvancedSourceEditorEnabled) {
      const previewRequestUpdate = getPreviewTransformRequestBody(
        dataView,
        transformConfigQuery,
        requestPayload,
        runtimeMappings
      );

      const stringifiedSourceConfigUpdate = JSON.stringify(
        previewRequestUpdate.source.query,
        null,
        2
      );

      setAdvancedEditorSourceConfig(stringifiedSourceConfigUpdate);
    }
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    isAdvancedSourceEditorEnabled,
    JSON.stringify(transformConfigQuery),
    JSON.stringify(requestPayload),
    JSON.stringify([runtimeMappings, runtimeMappingsUpdated, isRuntimeMappingsEditorEnabled]),
  ]);

  return {
    actions: {
      applyAdvancedSourceEditorChanges,
      setAdvancedSourceEditorApplyButtonEnabled,
      setAdvancedEditorSourceConfig,
      setAdvancedEditorSourceConfigLastApplied,
      setAdvancedSourceEditorSwitchModalVisible,
      toggleAdvancedSourceEditor,
    },
    state: {
      advancedEditorSourceConfig,
      advancedEditorSourceConfigLastApplied,
      isAdvancedSourceEditorApplyButtonEnabled,
      isAdvancedSourceEditorSwitchModalVisible,
    },
  };
};
