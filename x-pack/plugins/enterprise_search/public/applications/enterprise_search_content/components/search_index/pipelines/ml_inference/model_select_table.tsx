/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  DefaultItemAction,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiRadio,
  EuiSearchBarProps,
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
import { normalizeModelName, TRAINED_MODELS_PATH } from './utils';
import { TrainedModelHealth } from '../ml_model_health';
import { KibanaLogic } from '../../../../../shared/kibana';

export const ModelSelectTable: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  // const { ingestionMethod } = useValues(IndexViewLogic);
  const {
    addInferencePipelineModal: { configuration },
  } = useValues(MLInferenceLogic);
  const { areActionButtonsDisabled, isLoading, selectableModels } = useValues(ModelSelectLogic);
  const { createModel, startModel } = useActions(ModelSelectLogic);
  const { setInferencePipelineConfiguration } = useActions(MLInferenceLogic);

  const { modelID, pipelineName, isPipelineNameUserSupplied } = configuration;

  const actions: Array<DefaultItemAction<ModelSelectOptionProps>> = [
    {
      name: 'Tune model performance',
      description: 'Clone this user',
      icon: 'controlsHorizontal',
      type: 'icon',
      isPrimary: true,
      onClick: () =>
        KibanaLogic.values.navigateToUrl(TRAINED_MODELS_PATH, {
          shouldNotCreateHref: true,
        }),
    },
    {
      name: 'Model details',
      description: 'View model details',
      icon: 'popout',
      color: 'primary',
      type: 'icon',
      isPrimary: true,
      href: 'model.modelDetailsPageUrl',
      target: '_blank',
    },
  ];

  const columns: Array<EuiBasicTableColumn<ModelSelectOptionProps>> = [
    {
      name: '',
      render: (model: ModelSelectOptionProps) => {
        return (
          <EuiRadio
            title="ELSER model"
            id="ELSER model"
            checked={model.checked === 'on'}
            onChange={() => null}
          />
        );
      },
      width: '30px',
    },
    {
      name: '',
      truncateText: true,
      render: (model: ModelSelectOptionProps) => (
        <>
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
                    <EuiFlexItem style={{ overflow: 'hidden' }}>
                      <EuiText size="xs">
                        <div className="eui-textTruncate" title={model.description}>
                          {model.description}
                        </div>
                      </EuiText>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      ),
    },
    {
      name: '',
      render: (model: ModelSelectOptionProps) => {
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
      },
      width: '150px',
      align: 'right',
    },
    {
      name: '',
      description: '',
      actions,
      width: '60px',
    },
  ];

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
      schema: true,
    },
  };

  const getModelSelectOptionProps = (models: MlModel[]): ModelSelectOptionProps[] =>
    (models ?? []).map((model) => ({
      ...model,
      label: model.modelId,
      checked: model.modelId === modelID ? 'on' : undefined,
    }));

  const onClickRow = (selectedModel: ModelSelectOptionProps) => {
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

  return (
    <EuiPanel hasBorder={true}>
      <EuiInMemoryTable
        tableCaption="Demo of EuiBasicTable"
        columns={columns}
        search={search}
        items={getModelSelectOptionProps(selectableModels)}
        loading={isLoading}
        hasActions
        rowProps={(model) => ({
          onClick: () => onClickRow(model),
        })}
      />
    </EuiPanel>
  );
};
