/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useContext, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
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
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { useMlKibana } from '../../contexts/kibana';
import { type InferecePipelineCreationState } from './state';
import { EDIT_MESSAGE, CANCEL_EDIT_MESSAGE } from '../../components/ml_inference/constants';
import { isValidJson } from '../../../../common/util/validation_utils';
import { ModelsListContext } from '../test_models/models_list_context';
import { SaveChangesButton } from '../../components/ml_inference/components/save_changes_button';
import { validatePipelineProcessors } from '../../components/ml_inference/validation';

interface Props {
  handlePipelineConfigUpdate: (configUpdate: Partial<InferecePipelineCreationState>) => void;
  modelId: string;
  pipelineNameError: string | undefined;
  pipelineName: string;
  pipelineDescription: string;
  initialPipelineConfig?: InferecePipelineCreationState['initialPipelineConfig'];
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
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
  }) => {
    const [isProcessorConfigValid, setIsProcessorConfigValid] = useState<boolean>(true);
    const [processorConfigError, setProcessorConfigError] = useState<string | undefined>();

    const {
      services: {
        docLinks: { links },
      },
    } = useMlKibana();

    const currentContext = useContext(ModelsListContext);
    const [processorConfigString, setProcessorConfigString] = useState<string>(
      JSON.stringify(initialPipelineConfig ?? {}, null, 2)
    );
    const [editProcessorConfig, setEditProcessorConfig] = useState<boolean>(false);

    const handleConfigChange = (value: string, type: string) => {
      handlePipelineConfigUpdate({ [type]: value });
    };

    const updateProcessorConfig = () => {
      const invalidProcessorConfigMessage = validatePipelineProcessors(
        JSON.parse(processorConfigString)
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
      setProcessorConfigString(
        JSON.stringify(currentContext?.currentContext.pipelineConfig ?? {}, null, 2)
      );
      setIsProcessorConfigValid(true);
      setProcessorConfigError(undefined);
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
                defaultMessage="Build a {pipeline} to use the trained model - {modelId} - for inference."
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
              <FormattedMessage
                id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.descriptionUsePipelines"
                defaultMessage="Use {pipelineSimulateLink} or {reindexLink} to pass data into this pipeline. Predictions are stored in the Target field."
                values={{
                  reindexLink: (
                    <EuiLink
                      external
                      target="_blank"
                      href={links.upgradeAssistant.reindexWithPipeline}
                    >
                      _reindex API
                    </EuiLink>
                  ),
                  pipelineSimulateLink: (
                    <EuiLink external target="_blank" href={links.apis.simulatePipeline}>
                      pipeline/_simulate
                    </EuiLink>
                  ),
                }}
              />
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
                        defaultMessage: 'A description of what this pipeline does.',
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
                      defaultMessage: 'Add a description of what this pipeline does.',
                    }
                  )}
                  value={pipelineDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    handleConfigChange(e.target.value, 'pipelineDescription')
                  }
                />
              </EuiFormRow>
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
