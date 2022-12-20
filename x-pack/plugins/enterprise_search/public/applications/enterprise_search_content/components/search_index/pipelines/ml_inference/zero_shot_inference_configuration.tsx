/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiComboBox, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IndexViewLogic } from '../../index_view_logic';

import { MLInferenceLogic } from './ml_inference_logic';

type LabelOptions = Array<{ label: string }>;

export const ZeroShotClassificationInferenceConfiguration: React.FC = () => {
  const { ingestionMethod } = useValues(IndexViewLogic);
  const {
    addInferencePipelineModal: { configuration },
  } = useValues(MLInferenceLogic);
  const { setInferencePipelineConfiguration } = useActions(MLInferenceLogic);

  const zeroShotLabels = configuration?.inferenceConfig?.zero_shot_classification?.labels ?? [];
  const labelOptions = zeroShotLabels.map((label) => ({ label }));

  const onLabelChange = (selectedLabels: LabelOptions) => {
    const inferenceConfig =
      selectedLabels.length === 0
        ? undefined
        : {
            zero_shot_classification: {
              ...(configuration?.inferenceConfig?.zero_shot_classification ?? {}),
              labels: selectedLabels.map(({ label }) => label),
            },
          };
    setInferencePipelineConfiguration({
      ...configuration,
      inferenceConfig,
    });
  };
  const onCreateLabel = (labelValue: string, labels: LabelOptions = []) => {
    const normalizedLabelValue = labelValue.trim();
    if (!normalizedLabelValue) return;

    const existingLabel = labels.find((label) => label.label === normalizedLabelValue);
    if (existingLabel) return;
    setInferencePipelineConfiguration({
      ...configuration,
      inferenceConfig: {
        zero_shot_classification: {
          ...(configuration?.inferenceConfig?.zero_shot_classification ?? {}),
          labels: [...zeroShotLabels, normalizedLabelValue],
        },
      },
    });
  };
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.inference.zeroShot.labels.label',
          { defaultMessage: 'Class labels' }
        )}
        fullWidth
      >
        <EuiComboBox
          fullWidth
          data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-zeroShot-labels`}
          placeholder={i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.inference.zeroShot.labels.placeholder',
            { defaultMessage: 'Create labels' }
          )}
          options={labelOptions}
          selectedOptions={labelOptions}
          onChange={onLabelChange}
          onCreateOption={onCreateLabel}
          noSuggestions
        />
      </EuiFormRow>
    </>
  );
};
