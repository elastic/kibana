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
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelectable,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';

import { LicenseBadge } from './license_badge';
import { ModelSelectLogic } from './model_select_logic';
import { ModelSelectOption, ModelSelectOptionProps } from './model_select_option';
import { normalizeModelName } from './utils';

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

export const ModelDeployingButton: React.FC = () => {
  return (
    <EuiButton disabled color="primary" size="s">
      <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.deployingButton.label',
            {
              defaultMessage: 'Deploying',
            }
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
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

export const ModelStartingButton: React.FC = () => {
  return (
    <EuiButton disabled color="success" size="s">
      <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.startingButton.label',
            {
              defaultMessage: 'Starting',
            }
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiButton>
  );
};

export const NoModelSelected: React.FC = () => (
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

export const SelectedModel: React.FC<MlModel> = (model) => {
  const { createModel, startModel } = useActions(ModelSelectLogic);
  const { areActionButtonsDisabled } = useValues(ModelSelectLogic);

  return (
    <EuiPanel color="subdued" title="Selected model">
      <EuiPanel>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{model.title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="subdued">{model.modelId}</EuiTextColor>
          </EuiFlexItem>
          {model.description && (
            <EuiFlexItem>
              <EuiText size="xs">{model.description}</EuiText>
            </EuiFlexItem>
          )}
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
          {(model.isPlaceholder ||
            [
              MlModelDeploymentState.Downloading,
              MlModelDeploymentState.NotDeployed,
              MlModelDeploymentState.Starting,
            ].includes(model.deploymentState)) && (
            <>
              <EuiHorizontalRule margin="xs" />
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  {model.isPlaceholder ? (
                    <>
                      <EuiFlexItem grow={false}>
                        <DeployModelButton
                          onClick={() => createModel(model.modelId)}
                          disabled={areActionButtonsDisabled}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <p>
                            <EuiTextColor color="danger">
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.modelNotDeployedError',
                                { defaultMessage: 'Model must be deployed before use.' }
                              )}
                            </EuiTextColor>
                          </p>
                        </EuiText>
                      </EuiFlexItem>
                    </>
                  ) : model.deploymentState === MlModelDeploymentState.Downloading ? (
                    <EuiFlexItem grow={false}>
                      <ModelDeployingButton />
                    </EuiFlexItem>
                  ) : model.deploymentState === MlModelDeploymentState.NotDeployed ? (
                    <EuiFlexItem grow={false}>
                      <StartModelButton
                        onClick={() => startModel(model.modelId)}
                        disabled={areActionButtonsDisabled}
                      />
                    </EuiFlexItem>
                  ) : model.deploymentState === MlModelDeploymentState.Starting ? (
                    <EuiFlexItem grow={false}>
                      <ModelStartingButton />
                    </EuiFlexItem>
                  ) : (
                    <></>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
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
    const selectedModelOption = options.find((option) => option.checked === 'on');

    setInferencePipelineConfiguration({
      ...configuration,
      inferenceConfig: undefined,
      modelID: selectedModelOption?.modelId ?? '',
      isModelPlaceholderSelected: selectedModelOption?.isPlaceholder ?? false,
      fieldMappings: undefined,
      pipelineName: isPipelineNameUserSupplied
        ? pipelineName
        : indexName + '-' + normalizeModelName(selectedModelOption?.modelId ?? ''),
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
          height={384}
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
        {selectedModel ? <SelectedModel {...selectedModel} /> : <NoModelSelected />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
