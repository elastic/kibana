/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo } from 'react';

import {
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiTextArea,
  EuiPanel,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMlKibana } from '../../../contexts/kibana';
import type { MlInferenceState } from '../types';

interface Props {
  handlePipelineConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
  modelId: string;
  pipelineNameError: string | undefined;
  pipelineName: string;
  pipelineDescription: string;
  targetField: string;
  targetFieldError: string | undefined;
}

export const ConfigurePipeline: FC<Props> = memo(
  ({
    handlePipelineConfigUpdate,
    modelId,
    pipelineName,
    pipelineNameError,
    pipelineDescription,
    targetField,
    targetFieldError,
  }) => {
    const {
      services: {
        docLinks: { links },
      },
    } = useMlKibana();

    const handlePipelineNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      handlePipelineConfigUpdate({ pipelineName: value });
    };

    const handlePipelineDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = e.target;
      handlePipelineConfigUpdate({ pipelineDescription: value });
    };

    const handleTargetFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      handlePipelineConfigUpdate({ targetField: value });
    };

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={3}>
          <EuiTitle size="s">
            <h4>
              {i18n.translate(
                'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.title',
                { defaultMessage: 'Create a pipeline' }
              )}
            </h4>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText color="subdued" size="s">
            <p>
              <FormattedMessage
                id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.description"
                defaultMessage="Build a {pipeline} that will utilize the pre-trained data frame analytics model - {modelId} - to infer against the data that is being ingested in the pipeline."
                values={{
                  modelId: <EuiCode>{modelId}</EuiCode>,
                  pipeline: (
                    <EuiLink external target="_blank" href={links.ingest.pipelines}>
                      pipeline
                    </EuiLink>
                  ),
                }}
              />
            </p>
            <p>
              {i18n.translate(
                'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.descriptionUsePipelines',
                {
                  defaultMessage:
                    'Pipelines you create will be saved and can be used elsewhere in your Elastic deployment.',
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiPanel hasBorder={false} hasShadow={false}>
            {/* NAME */}
            <EuiForm component="form">
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.nameLabel',
                  {
                    defaultMessage: 'Name',
                  }
                )}
                helpText={
                  !pipelineNameError && (
                    <EuiText size="xs">
                      {i18n.translate(
                        'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.name.helpText',
                        {
                          defaultMessage:
                            'Pipeline names are unique within a deployment and can only contain letters, numbers, underscores, and hyphens. This will create a pipeline named {pipelineName}.',
                          values: {
                            pipelineName: `${pipelineName.length > 0 ? pipelineName : '<name>'}`,
                          },
                        }
                      )}
                    </EuiText>
                  )
                }
                error={pipelineNameError}
                isInvalid={pipelineNameError !== undefined}
              >
                <EuiFieldText
                  fullWidth
                  placeholder={i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.namePlaceholder',
                    {
                      defaultMessage: 'Enter a unique name for this pipeline',
                    }
                  )}
                  value={pipelineName}
                  onChange={handlePipelineNameChange}
                />
              </EuiFormRow>
              {/* DESCRIPTION */}
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.descriptionLabel',
                  {
                    defaultMessage: 'Description',
                  }
                )}
                helpText={
                  <EuiText size="xs">
                    {i18n.translate(
                      'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.description.helpText',
                      {
                        defaultMessage: 'A description of what this pipeline does.',
                      }
                    )}
                  </EuiText>
                }
              >
                <EuiTextArea
                  compressed
                  fullWidth
                  placeholder={i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.descriptionPlaceholder',
                    {
                      defaultMessage: 'Add a description of what this pipeline does.',
                    }
                  )}
                  value={pipelineDescription}
                  onChange={handlePipelineDescriptionChange}
                />
              </EuiFormRow>
              {/* TARGET FIELD */}
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.targetFieldLabel',
                  {
                    defaultMessage: 'Target field (optional)',
                  }
                )}
                helpText={
                  !targetFieldError && (
                    <FormattedMessage
                      id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.targetFieldHelpText"
                      defaultMessage="Field used to contain inference processor results. Defaults to {targetField}."
                      values={{ targetField: <EuiCode>{'ml.inference.<processor_tag>'}</EuiCode> }}
                    />
                  )
                }
                error={targetFieldError}
                isInvalid={targetFieldError !== undefined}
              >
                <EuiFieldText fullWidth value={targetField} onChange={handleTargetFieldChange} />
              </EuiFormRow>
            </EuiForm>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
