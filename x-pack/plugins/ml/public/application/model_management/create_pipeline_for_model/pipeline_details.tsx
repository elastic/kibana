/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import type { SupportedPytorchTasksType } from '@kbn/ml-trained-models-utils';
import { type InferecePipelineCreationState } from './state';
import { EDIT_MESSAGE, CANCEL_EDIT_MESSAGE } from '../../components/ml_inference/constants';
import { isValidJson } from '../../../../common/util/validation_utils';
import { useTestTrainedModelsContext } from '../test_models/test_trained_models_context';
import { SaveChangesButton } from '../../components/ml_inference/components/save_changes_button';
import { validatePipelineProcessors } from '../../components/ml_inference/validation';
import { PipelineDetailsTitle, PipelineNameAndDescription } from '../../components/shared';

interface Props {
  handlePipelineConfigUpdate: (configUpdate: Partial<InferecePipelineCreationState>) => void;
  modelId: string;
  pipelineNameError: string | undefined;
  pipelineName: string;
  pipelineDescription: string;
  initialPipelineConfig?: InferecePipelineCreationState['initialPipelineConfig'];
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  taskType?: SupportedPytorchTasksType;
}

export const PipelineDetails: FC<Props> = memo(
  ({
    handlePipelineConfigUpdate,
    modelId,
    pipelineName,
    pipelineNameError,
    pipelineDescription,
    initialPipelineConfig,
    setHasUnsavedChanges,
    taskType,
  }) => {
    const [isProcessorConfigValid, setIsProcessorConfigValid] = useState<boolean>(true);
    const [processorConfigError, setProcessorConfigError] = useState<string | undefined>();

    const {
      currentContext: { pipelineConfig },
    } = useTestTrainedModelsContext();
    const [processorConfigString, setProcessorConfigString] = useState<string>(
      JSON.stringify(initialPipelineConfig ?? {}, null, 2)
    );
    const [editProcessorConfig, setEditProcessorConfig] = useState<boolean>(false);

    const updateProcessorConfig = () => {
      const invalidProcessorConfigMessage = validatePipelineProcessors(
        JSON.parse(processorConfigString),
        taskType
      );
      if (invalidProcessorConfigMessage === undefined) {
        handlePipelineConfigUpdate({ initialPipelineConfig: JSON.parse(processorConfigString) });
        setHasUnsavedChanges(false);
        setEditProcessorConfig(false);
        setProcessorConfigError(undefined);
      } else {
        setHasUnsavedChanges(true);
        setIsProcessorConfigValid(false);
        setProcessorConfigError(invalidProcessorConfigMessage);
      }
    };

    const handleProcessorConfigChange = (json: string) => {
      setProcessorConfigString(json);
      const valid = isValidJson(json);
      setIsProcessorConfigValid(valid);
    };

    const resetProcessorConfig = () => {
      setProcessorConfigString(JSON.stringify(pipelineConfig, null, 2));
      setIsProcessorConfigValid(true);
      setProcessorConfigError(undefined);
    };

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={3}>
          <PipelineDetailsTitle modelId={modelId} />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiPanel hasBorder={false} hasShadow={false}>
            {/* NAME */}
            <EuiForm component="form">
              {/* NAME  and DESCRIPTION */}
              <PipelineNameAndDescription
                pipelineName={pipelineName}
                pipelineDescription={pipelineDescription}
                pipelineNameError={pipelineNameError}
                handlePipelineConfigUpdate={handlePipelineConfigUpdate}
              />
              {/* PROCESSOR CONFIGURATION */}
              <EuiFormRow
                fullWidth
                labelAppend={
                  <EuiFlexGroup gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        data-test-subj="mlTrainedModelsInferencePipelineInferenceConfigEditButton"
                        iconType="pencil"
                        size="xs"
                        onClick={() => {
                          const editingState = !editProcessorConfig;
                          if (editingState === false) {
                            setProcessorConfigError(undefined);
                            setIsProcessorConfigValid(true);
                            setHasUnsavedChanges(false);
                          }
                          setEditProcessorConfig(editingState);
                        }}
                      >
                        {editProcessorConfig ? CANCEL_EDIT_MESSAGE : EDIT_MESSAGE}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {editProcessorConfig ? (
                        <SaveChangesButton
                          onClick={updateProcessorConfig}
                          disabled={isProcessorConfigValid === false}
                        />
                      ) : null}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {editProcessorConfig ? (
                        <EuiButtonEmpty size="xs" onClick={resetProcessorConfig}>
                          {i18n.translate(
                            'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.resetInferenceConfigButton',
                            { defaultMessage: 'Reset' }
                          )}
                        </EuiButtonEmpty>
                      ) : null}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                error={processorConfigError}
                isInvalid={processorConfigError !== undefined}
                data-test-subj="mlTrainedModelsInferencePipelineInferenceConfigEditor"
              >
                {editProcessorConfig ? (
                  <CodeEditor
                    height={300}
                    languageId="json"
                    options={{
                      automaticLayout: true,
                      lineNumbers: 'off',
                      tabSize: 2,
                    }}
                    value={processorConfigString}
                    onChange={handleProcessorConfigChange}
                  />
                ) : (
                  <EuiCodeBlock
                    isCopyable={true}
                    data-test-subj="mlTrainedModelsInferencePipelineInferenceConfigBlock"
                  >
                    {processorConfigString}
                  </EuiCodeBlock>
                )}
              </EuiFormRow>
            </EuiForm>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
