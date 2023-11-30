/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IndexNameLogic } from '../../index_name_logic';
import { IndexViewLogic } from '../../index_view_logic';

import { EMPTY_PIPELINE_CONFIGURATION, MLInferenceLogic } from './ml_inference_logic';
import { MlModelSelectOption } from './model_select_option';
import { PipelineSelectOption } from './pipeline_select_option';
import { MODEL_REDACTED_VALUE, MODEL_SELECT_PLACEHOLDER, normalizeModelName } from './utils';

const MODEL_SELECT_PLACEHOLDER_VALUE = 'model_placeholder$$';
const PIPELINE_SELECT_PLACEHOLDER_VALUE = 'pipeline_placeholder$$';

const CREATE_NEW_TAB_NAME = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.tabs.createNew.name',
  { defaultMessage: 'Create new' }
);

const USE_EXISTING_TAB_NAME = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.tabs.useExisting.name',
  { defaultMessage: 'Use existing' }
);

export enum ConfigurePipelineTabId {
  CREATE_NEW = 'create_new',
  USE_EXISTING = 'use_existing',
}

export const ConfigurePipeline: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration },
    formErrors,
    existingInferencePipelines,
    supportedMLModels,
  } = useValues(MLInferenceLogic);
  const { selectExistingPipeline, setInferencePipelineConfiguration } =
    useActions(MLInferenceLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const { indexName } = useValues(IndexNameLogic);

  const { existingPipeline, modelID, pipelineName, isPipelineNameUserSupplied } = configuration;

  const nameError = formErrors.pipelineName !== undefined && pipelineName.length > 0;

  const modelOptions: Array<EuiSuperSelectOption<string>> = [
    {
      disabled: true,
      inputDisplay:
        existingPipeline && pipelineName.length > 0
          ? MODEL_REDACTED_VALUE
          : MODEL_SELECT_PLACEHOLDER,
      value: MODEL_SELECT_PLACEHOLDER_VALUE,
    },
    ...supportedMLModels.map((model) => ({
      dropdownDisplay: <MlModelSelectOption model={model} />,
      inputDisplay: model.model_id,
      value: model.model_id,
    })),
  ];
  const pipelineOptions: Array<EuiSuperSelectOption<string>> = [
    {
      disabled: true,
      inputDisplay: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.placeholder',
        { defaultMessage: 'Select one' }
      ),
      value: PIPELINE_SELECT_PLACEHOLDER_VALUE,
    },
    ...(existingInferencePipelines?.map((pipeline) => ({
      disabled: pipeline.disabled,
      dropdownDisplay: <PipelineSelectOption pipeline={pipeline} />,
      inputDisplay: pipeline.pipelineName,
      value: pipeline.pipelineName,
    })) ?? []),
  ];

  const inputsDisabled = configuration.existingPipeline !== false;

  const tabs: EuiTabbedContentTab[] = [
    {
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiForm component="form">
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.nameLabel',
                {
                  defaultMessage: 'Name',
                }
              )}
              helpText={
                !nameError && (
                  <EuiText size="xs">
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.name.helpText',
                      {
                        defaultMessage:
                          'Pipeline names are unique within a deployment and can only contain letters, numbers, underscores, and hyphens. This will create a pipeline named {pipelineName}.',
                        values: {
                          pipelineName: `ml-inference-${pipelineName}`,
                        },
                      }
                    )}
                  </EuiText>
                )
              }
              error={nameError && formErrors.pipelineName}
              isInvalid={nameError}
            >
              <EuiFieldText
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-uniqueName`}
                disabled={inputsDisabled}
                fullWidth
                prepend="ml-inference-"
                placeholder={i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.namePlaceholder',
                  {
                    defaultMessage: 'Enter a unique name for this pipeline',
                  }
                )}
                value={pipelineName}
                onChange={(e) =>
                  setInferencePipelineConfiguration({
                    ...configuration,
                    isPipelineNameUserSupplied: e.target.value.length > 0,
                    pipelineName: e.target.value,
                  })
                }
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.titleSelectTrainedModel',
                { defaultMessage: 'Select a trained ML Model' }
              )}
            >
              <EuiSuperSelect
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-selectTrainedModel`}
                fullWidth
                hasDividers
                disabled={inputsDisabled}
                itemLayoutAlign="top"
                onChange={(value) =>
                  setInferencePipelineConfiguration({
                    ...configuration,
                    inferenceConfig: undefined,
                    modelID: value,
                    fieldMappings: undefined,
                    pipelineName: isPipelineNameUserSupplied
                      ? pipelineName
                      : indexName + '-' + normalizeModelName(value),
                  })
                }
                options={modelOptions}
                valueOfSelected={modelID === '' ? MODEL_SELECT_PLACEHOLDER_VALUE : modelID}
              />
            </EuiFormRow>
          </EuiForm>
        </>
      ),
      id: ConfigurePipelineTabId.CREATE_NEW,
      name: CREATE_NEW_TAB_NAME,
    },
    {
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiForm component="form">
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipelineLabel',
                {
                  defaultMessage: 'Select an existing inference pipeline',
                }
              )}
            >
              <EuiSuperSelect
                fullWidth
                hasDividers
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-selectExistingPipeline`}
                valueOfSelected={
                  pipelineName.length > 0 ? pipelineName : PIPELINE_SELECT_PLACEHOLDER_VALUE
                }
                options={pipelineOptions}
                onChange={(value) => selectExistingPipeline(value)}
              />
            </EuiFormRow>
          </EuiForm>
        </>
      ),
      id: ConfigurePipelineTabId.USE_EXISTING,
      name: USE_EXISTING_TAB_NAME,
    },
  ];

  return (
    <>
      <EuiTitle size="s">
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.title',
            { defaultMessage: 'Configure a pipeline' }
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="s">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.description',
            {
              defaultMessage:
                'Build or reuse a child pipeline that will be used as a processor in your main pipeline.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiTabbedContent
        tabs={tabs}
        autoFocus="selected"
        onTabClick={(tab) => {
          const isExistingPipeline = tab.id === ConfigurePipelineTabId.USE_EXISTING;
          if (isExistingPipeline !== configuration.existingPipeline) {
            setInferencePipelineConfiguration({
              ...EMPTY_PIPELINE_CONFIGURATION,
              existingPipeline: isExistingPipeline,
            });
          }
        }}
      />
    </>
  );
};
