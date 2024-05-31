/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';

import {
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MlInferenceState } from '../types';
import { PipelineDetailsTitle, PipelineNameAndDescription } from '../../shared';

interface Props {
  handlePipelineConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
  modelId: string;
  pipelineNameError: string | undefined;
  pipelineName: string;
  pipelineDescription: string;
  targetField: string;
  targetFieldError: string | undefined;
}

export const PipelineDetails: FC<Props> = memo(
  ({
    handlePipelineConfigUpdate,
    modelId,
    pipelineName,
    pipelineNameError,
    pipelineDescription,
    targetField,
    targetFieldError,
  }) => {
    const handleConfigChange = (value: string, type: string) => {
      handlePipelineConfigUpdate({ [type]: value });
    };

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={3}>
          <PipelineDetailsTitle modelId={modelId} />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiPanel hasBorder={false} hasShadow={false}>
            <EuiForm component="form">
              {/* NAME  and DESCRIPTION */}
              <PipelineNameAndDescription
                pipelineName={pipelineName}
                pipelineDescription={pipelineDescription}
                pipelineNameError={pipelineNameError}
                handlePipelineConfigUpdate={handlePipelineConfigUpdate}
              />
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
                <EuiFieldText
                  fullWidth
                  data-test-subj="mlTrainedModelsInferencePipelineTargetFieldInput"
                  value={targetField}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleConfigChange(e.target.value, 'targetField')
                  }
                />
              </EuiFormRow>
            </EuiForm>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
