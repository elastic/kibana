/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSelectable,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';

import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';

import { ModelSelectLogic } from './model_select_logic';
import { LicenseBadge, ModelSelectOption, ModelSelectOptionProps } from './model_select_option';
import { normalizeModelName } from './utils';
import { i18n } from '@kbn/i18n';
import { TrainedModelHealth } from '../ml_model_health';

export const DeployModelButton: React.FC<{ onClick: () => void; disabled: boolean }> = ({
  onClick,
  disabled,
}) => {
  return (
    <EuiButton onClick={onClick} disabled={disabled} color="primary" iconType="download" size="s">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.deployButton.label',
        {
          defaultMessage: 'Deploy',
        }
      )}
    </EuiButton>
  );
};

export const StartModelButton: React.FC<{ onClick: () => void; disabled: boolean }> = ({
  onClick,
  disabled,
}) => {
  return (
    <EuiButton onClick={onClick} disabled={disabled} color="success" iconType="play" size="s">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.startButton.label',
        {
          defaultMessage: 'Start',
        }
      )}
    </EuiButton>
  );
};

export type SelectedModelProps = {
  model: MlModel | undefined;
};

const NoModelSelected: React.FC = () => (
  <EuiPanel
    color="subdued"
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <EuiText textAlign="center" color="subdued" size="s">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.noModelSelectedPanel.text',
        { defaultMessage: 'Select an available model to add to your inference pipeline' }
      )}
    </EuiText>
  </EuiPanel>
);

const SelectedModel: React.FC<SelectedModelProps> = (props) => {
  const { createModel, startModel } = useActions(ModelSelectLogic);
  const { areActionButtonsDisabled, modelNotDeployedError } = useValues(ModelSelectLogic);

  return props.model ? (
    <EuiPanel color="subdued" title="Selected model">
      <EuiPanel>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{props.model.title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="subdued">{props.model.modelId}</EuiTextColor>
          </EuiFlexItem>
          {props.model.description && (
            <EuiFlexItem>
              <EuiText size="xs">{props.model.description}</EuiText>
            </EuiFlexItem>
          )}
          {props.model.licenseType && (
            <EuiFlexItem grow={false}>
              {/* Wrap in a div to prevent the badge from growing to a whole row on mobile */}
              <div>
                <LicenseBadge
                  licenseType={props.model.licenseType}
                  modelDetailsPageUrl={props.model.modelDetailsPageUrl}
                />
              </div>
            </EuiFlexItem>
          )}
          <EuiHorizontalRule margin="xs" />
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {props.model.isPlaceholder ? (
                <EuiFlexItem grow={false}>
                  <DeployModelButton
                    onClick={() => createModel(props.model!.modelId)}
                    disabled={areActionButtonsDisabled}
                  />
                </EuiFlexItem>
              ) : props.model.deploymentState === MlModelDeploymentState.NotDeployed ? (
                <EuiFlexItem grow={false}>
                  <StartModelButton
                    onClick={() => startModel(props.model!.modelId)}
                    disabled={areActionButtonsDisabled}
                  />
                </EuiFlexItem>
              ) : (
                <></>
              )}
              <EuiFlexItem grow={false}>
                {/* Wrap in a div to prevent the badge from growing to a whole row on mobile */}
                <div>
                  <TrainedModelHealth
                    modelState={props.model.deploymentState}
                    modelStateReason={props.model.deploymentStateReason}
                    isDownloadable={props.model.isPlaceholder}
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {modelNotDeployedError && (
            <EuiFlexItem>
              <EuiText size="xs">
                <p>
                  <EuiTextColor color="danger">{modelNotDeployedError}</EuiTextColor>
                </p>
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  ) : (
    <NoModelSelected />
  );
};

export const ModelSelect: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration, indexName },
    ingestionMethod,
    isLoading,
    selectableModels,
    selectedModel,
  } = useValues(ModelSelectLogic);
  const { setInferencePipelineConfiguration } = useActions(ModelSelectLogic);

  const { modelID, pipelineName, isPipelineNameUserSupplied } = configuration;

  const getModelSelectOptionProps = (models: MlModel[]): ModelSelectOptionProps[] =>
    (models ?? []).map((model) => ({
      ...model,
      label: model.modelId,
      checked: model.modelId === modelID ? 'on' : undefined,
    }));

  const onChange = (options: ModelSelectOptionProps[]) => {
    const selectedModel = options.find((option) => option.checked === 'on');

    setInferencePipelineConfiguration({
      ...configuration,
      inferenceConfig: undefined,
      modelID: selectedModel?.modelId ?? '',
      isModelPlaceholderSelected: selectedModel?.isPlaceholder ?? false,
      fieldMappings: undefined,
      pipelineName: isPipelineNameUserSupplied
        ? pipelineName
        : indexName + '-' + normalizeModelName(selectedModel?.modelId ?? ''),
    });
  };

  const renderOption = (option: ModelSelectOptionProps) => <ModelSelectOption {...option} />;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiSelectable
          data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-selectTrainedModel`}
          options={getModelSelectOptionProps(selectableModels)}
          singleSelection="always"
          listProps={{
            bordered: true,
            rowHeight: useIsWithinMaxBreakpoint('s') ? 128 : 96,
            onFocusBadge: false,
          }}
          height={360}
          onChange={onChange}
          renderOption={renderOption}
          isLoading={isLoading}
          searchable
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiFlexItem>
      <EuiFlexItem>
        <SelectedModel model={selectedModel} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
