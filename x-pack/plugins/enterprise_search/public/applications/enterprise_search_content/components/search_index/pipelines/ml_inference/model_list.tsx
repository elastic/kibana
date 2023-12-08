/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiRadio,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';
import { IndexNameLogic } from '../../index_name_logic';

import { MLInferenceLogic } from './ml_inference_logic';
import { ModelSelectLogic } from './model_select_logic';
import {
  DeployModelButton,
  LicenseBadge,
  ModelSelectOptionProps,
  StartModelButton,
} from './model_select_option';
import { normalizeModelName } from './utils';
import { TrainedModelHealth } from '../ml_model_health';

export const ModelList: React.FC = () => {
  const { createModel, startModel } = useActions(ModelSelectLogic);
  const { setInferencePipelineConfiguration } = useActions(MLInferenceLogic);
  const { areActionButtonsDisabled, selectableModels } = useValues(ModelSelectLogic);
  const {
    addInferencePipelineModal: { configuration },
  } = useValues(MLInferenceLogic);
  const { indexName } = useValues(IndexNameLogic);

  const { modelID, pipelineName, isPipelineNameUserSupplied } = configuration;

  const getModelSelectOptionProps = (model: MlModel): ModelSelectOptionProps => ({
    ...model,
    label: model.modelId,
    checked: model.modelId === modelID ? 'on' : undefined,
  });

  const onClickPanel = (selectedModel: ModelSelectOptionProps) => {
    selectedModel.checked = 'on';
    setInferencePipelineConfiguration({
      ...configuration,
      inferenceConfig: undefined,
      modelID: selectedModel?.modelId ?? '',
      fieldMappings: undefined,
      pipelineName: isPipelineNameUserSupplied
        ? pipelineName
        : indexName + '-' + normalizeModelName(selectedModel?.modelId ?? ''),
    });
  };

  const Selection: React.FC<ModelSelectOptionProps> = (model: ModelSelectOptionProps) => {
    return (
      <EuiRadio
        title={model.title}
        id={model.modelId}
        checked={model.checked === 'on'}
        onChange={() => null}
      />
    );
  };

  const ModelDetails: React.FC<ModelSelectOptionProps> = (model: ModelSelectOptionProps) => {
    return (
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{model.title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTextColor color="subdued">{model.modelId}</EuiTextColor>
        </EuiFlexItem>
        {(model.licenseType || model.description) && (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              {model.licenseType && (
                <EuiFlexItem grow={false}>
                  {/* Wrap in a div to prevent the badge from growing to a whole row on mobile */}
                  <div>
                    <LicenseBadge
                      licenseType={model.licenseType}
                      modelDetailsPageUrl={model.modelDetailsPageUrl}
                    />
                  </div>
                </EuiFlexItem>
              )}
              {model.description && (
                <EuiFlexItem>
                  <EuiText size="xs">
                    <div className="eui-textTruncate">{model.description}</div>
                    {/* <EuiTextTruncate text={model.description} /> */}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  const StatusOrAction: React.FC<ModelSelectOptionProps> = (model: ModelSelectOptionProps) => {
    return model.isPlaceholder ? (
      <DeployModelButton
        onClick={() => createModel(model.modelId)}
        disabled={areActionButtonsDisabled}
      />
    ) : model.deploymentState === MlModelDeploymentState.Downloaded ? (
      <StartModelButton
        onClick={() => startModel(model.modelId)}
        disabled={areActionButtonsDisabled}
      />
    ) : (
      <TrainedModelHealth
        modelState={model.deploymentState}
        modelStateReason={model.deploymentStateReason}
      />
    );
  };

  return (
    <>
      {selectableModels.map(getModelSelectOptionProps).map((model) => (
        <EuiPanel hasBorder paddingSize="s" onClick={() => onClickPanel(model)}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
              <Selection {...model} />
            </EuiFlexItem>
            <EuiFlexItem style={{ overflow: 'hidden' }}>
              <ModelDetails {...model} />
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
              <StatusOrAction {...model} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ))}
    </>
  );
};
