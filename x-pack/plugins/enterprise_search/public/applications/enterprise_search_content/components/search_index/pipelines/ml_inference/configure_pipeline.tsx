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
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../../../shared/doc_links';

import { IndexViewLogic } from '../../index_view_logic';

import { InferenceConfiguration } from './inference_config';
import { EMPTY_PIPELINE_CONFIGURATION, MLInferenceLogic } from './ml_inference_logic';
import { MlModelSelectOption } from './model_select_option';
import { PipelineSelectOption } from './pipeline_select_option';
import { MODEL_REDACTED_VALUE, MODEL_SELECT_PLACEHOLDER } from './utils';

const MODEL_SELECT_PLACEHOLDER_VALUE = 'model_placeholder$$';
const PIPELINE_SELECT_PLACEHOLDER_VALUE = 'pipeline_placeholder$$';

const CHOOSE_EXISTING_LABEL = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.chooseLabel',
  { defaultMessage: 'Choose' }
);
const CHOOSE_NEW_LABEL = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.newLabel',
  { defaultMessage: 'New' }
);
const CHOOSE_PIPELINE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.existingLabel',
  { defaultMessage: 'Existing' }
);

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

  const { existingPipeline, modelID, pipelineName } = configuration;
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

  return (
    <>
      <EuiTitle size="xs">
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.title',
            { defaultMessage: 'Add a new pipeline' }
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText color="subdued">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.description',
            {
              defaultMessage:
                "Once created, this pipeline will be added as a processor on your Enterprise Search Ingestion Pipeline. You'll also be able to use this pipeline elsewhere in your Elastic deployment.",
            }
          )}
        </p>
        <EuiLink href={docLinks.deployTrainedModels} target="_blank">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.docsLink',
            {
              defaultMessage: 'Learn more about using ML models in Enterprise Search',
            }
          )}
        </EuiLink>
      </EuiText>
      <EuiSpacer />
      <EuiForm component="form">
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.chooseExistingLabel',
                { defaultMessage: 'New or existing' }
              )}
            >
              <EuiSelect
                options={[
                  {
                    disabled: true,
                    text: CHOOSE_EXISTING_LABEL,
                    value: '',
                  },
                  {
                    text: CHOOSE_NEW_LABEL,
                    value: 'false',
                  },
                  {
                    disabled:
                      !existingInferencePipelines || existingInferencePipelines.length === 0,
                    text: CHOOSE_PIPELINE_LABEL,
                    value: 'true',
                  },
                ]}
                onChange={(e) =>
                  setInferencePipelineConfiguration({
                    ...EMPTY_PIPELINE_CONFIGURATION,
                    existingPipeline: e.target.value === 'true',
                  })
                }
                value={configuration.existingPipeline?.toString() ?? ''}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            {configuration.existingPipeline === true ? (
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
            ) : (
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.nameLabel',
                  {
                    defaultMessage: 'Name',
                  }
                )}
                helpText={
                  !nameError &&
                  configuration.existingPipeline === false && (
                    <EuiText size="xs">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.name.helpText',
                        {
                          defaultMessage:
                            'Pipeline names are unique within a deployment and can only contain letters, numbers, underscores, and hyphens. This will create a pipeline named {pipelineName}.',
                          values: {
                            pipelineName: `ml-inference-${
                              pipelineName.length > 0 ? pipelineName : '<name>'
                            }`,
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
                      pipelineName: e.target.value,
                    })
                  }
                />
              </EuiFormRow>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.modelLabel',
            {
              defaultMessage: 'Select a trained ML Model',
            }
          )}
          fullWidth
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
              })
            }
            options={modelOptions}
            valueOfSelected={modelID === '' ? MODEL_SELECT_PLACEHOLDER_VALUE : modelID}
          />
        </EuiFormRow>
        <InferenceConfiguration />
      </EuiForm>
    </>
  );
};
