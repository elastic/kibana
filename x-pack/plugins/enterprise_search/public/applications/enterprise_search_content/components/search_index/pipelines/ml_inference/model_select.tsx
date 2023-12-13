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
import { IndexNameLogic } from '../../index_name_logic';
import { IndexViewLogic } from '../../index_view_logic';

import { MLInferenceLogic } from './ml_inference_logic';
import { ModelSelectLogic } from './model_select_logic';
import { LicenseBadge, ModelSelectOption, ModelSelectOptionProps } from './model_select_option';
import { normalizeModelName } from './utils';
import { i18n } from '@kbn/i18n';

export const DeployModelButton: React.FC<{ onClick: () => void; disabled: boolean }> = ({
  onClick,
  disabled,
}) => {
  return (
    <EuiButton onClick={onClick} disabled={disabled} color="primary" iconType="download" size="s">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelectOption.deployButton.label',
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
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelectOption.startButton.label',
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
  <EuiPanel color="subdued">
    <EuiText textAlign="center">
      Select an available model to add to your inference pipeline
    </EuiText>
  </EuiPanel>
);

const SelectedModel: React.FC<SelectedModelProps> = (props) => {
  const { createModel, startModel } = useActions(ModelSelectLogic);
  const { areActionButtonsDisabled } = useValues(ModelSelectLogic);

  console.log('props.model', props.model)

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
          {(props.model.isPlaceholder || props.model.deploymentState === MlModelDeploymentState.Downloaded) && (
            <>
              <EuiHorizontalRule margin="s" />
              <EuiFlexItem grow={false}>
                {props.model.isPlaceholder ? (
                  <DeployModelButton
                    onClick={() => createModel(props.model!.modelId)}
                    disabled={areActionButtonsDisabled}
                  />
                ) : props.model.deploymentState === MlModelDeploymentState.Downloaded ? (
                  <StartModelButton
                    onClick={() => startModel(props.model!.modelId)}
                    disabled={areActionButtonsDisabled}
                  />
                ) : (
                  <></>
                )}
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  ) : (
    <NoModelSelected />
  );
};

export const ModelSelect: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const {
    addInferencePipelineModal: { configuration },
  } = useValues(MLInferenceLogic);
  const { isLoading, selectableModels, selectedModel } = useValues(ModelSelectLogic);
  const { setInferencePipelineConfiguration } = useActions(MLInferenceLogic);

  const { modelID, pipelineName, isPipelineNameUserSupplied } = configuration;

  const getModelSelectOptionProps = (models: MlModel[]): ModelSelectOptionProps[] =>
    (models ?? []).map((model) => ({
      ...model,
      label: model.modelId,
      checked: model.modelId === modelID ? 'on' : undefined,
    }));

  const onChange = (options: ModelSelectOptionProps[]) => {
    const selectedModel = options.find((option) => option.checked === 'on');

    console.log('selectedModel', selectedModel)

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
            rowHeight: useIsWithinMaxBreakpoint('s') ? 180 : 90,
            // showIcons: false,
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
