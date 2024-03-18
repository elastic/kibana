/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFormRow, EuiText, EuiTextArea } from '@elastic/eui';

interface Props {
  handlePipelineConfigUpdate: (configUpdate: Partial<any>) => void;
  pipelineNameError: string | undefined;
  pipelineDescription: string;
  pipelineName: string;
}

export const PipelineNameAndDescription: FC<Props> = ({
  pipelineName,
  pipelineNameError,
  pipelineDescription,
  handlePipelineConfigUpdate,
}) => {
  const handleConfigChange = (value: string, type: string) => {
    handlePipelineConfigUpdate({ [type]: value });
  };

  return (
    <>
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
                    'Pipeline names are unique within a deployment and can only contain letters, numbers, underscores, and hyphens.',
                }
              )}
            </EuiText>
          )
        }
        error={pipelineNameError}
        isInvalid={pipelineNameError !== undefined}
      >
        <EuiFieldText
          data-test-subj="mlTrainedModelsInferencePipelineNameInput"
          fullWidth
          placeholder={i18n.translate(
            'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.namePlaceholder',
            {
              defaultMessage: 'Enter a unique name for this pipeline',
            }
          )}
          value={pipelineName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleConfigChange(e.target.value, 'pipelineName')
          }
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
                defaultMessage: 'A description of the pipeline.',
              }
            )}
          </EuiText>
        }
      >
        <EuiTextArea
          compressed
          fullWidth
          data-test-subj="mlTrainedModelsInferencePipelineDescriptionInput"
          placeholder={i18n.translate(
            'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.descriptionPlaceholder',
            {
              defaultMessage: 'Add a pipeline description.',
            }
          )}
          value={pipelineDescription}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleConfigChange(e.target.value, 'pipelineDescription')
          }
        />
      </EuiFormRow>
    </>
  );
};
