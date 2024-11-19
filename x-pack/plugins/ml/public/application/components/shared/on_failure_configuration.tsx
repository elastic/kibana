/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, memo } from 'react';

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { SaveChangesButton } from '../ml_inference/components/save_changes_button';
import type { MlInferenceState } from '../ml_inference/types';
import { getDefaultOnFailureConfiguration } from '../ml_inference/state';
import { CANCEL_EDIT_MESSAGE, EDIT_MESSAGE } from '../ml_inference/constants';
import { useMlKibana } from '../../contexts/kibana';
import { isValidJson } from '../../../../common/util/validation_utils';

interface Props {
  handleAdvancedConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
  ignoreFailure: boolean;
  onFailure: MlInferenceState['onFailure'];
  takeActionOnFailure: MlInferenceState['takeActionOnFailure'];
}

export const OnFailureConfiguration: FC<Props> = memo(
  ({ handleAdvancedConfigUpdate, ignoreFailure, onFailure, takeActionOnFailure }) => {
    const {
      services: {
        docLinks: { links },
      },
    } = useMlKibana();

    const [editOnFailure, setEditOnFailure] = useState<boolean>(false);
    const [isOnFailureValid, setIsOnFailureValid] = useState<boolean>(false);
    const [onFailureString, setOnFailureString] = useState<string>(
      JSON.stringify(onFailure, null, 2)
    );

    const updateIgnoreFailure = (e: EuiSwitchEvent) => {
      const checked = e.target.checked;
      handleAdvancedConfigUpdate({
        ignoreFailure: checked,
        ...(checked === true ? { takeActionOnFailure: false, onFailure: undefined } : {}),
      });
    };

    const updateOnFailure = () => {
      handleAdvancedConfigUpdate({ onFailure: JSON.parse(onFailureString) });
      setEditOnFailure(false);
    };

    const handleOnFailureChange = (json: string) => {
      setOnFailureString(json);
      const valid = isValidJson(json);
      setIsOnFailureValid(valid);
    };

    const handleTakeActionOnFailureChange = (checked: boolean) => {
      handleAdvancedConfigUpdate({
        takeActionOnFailure: checked,
        onFailure: checked === false ? undefined : getDefaultOnFailureConfiguration(),
      });
      if (checked === false) {
        setEditOnFailure(false);
        setIsOnFailureValid(true);
      }
    };

    const resetOnFailure = () => {
      setOnFailureString(JSON.stringify(getDefaultOnFailureConfiguration(), null, 2));
      setIsOnFailureValid(true);
    };

    return (
      <EuiFlexGroup direction="column" data-test-subj="mlTrainedModelsInferenceOnFailureStep">
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={3}>
              <EuiTitle size="s">
                <h4>
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.onFailureTitle',
                    { defaultMessage: 'Ingesting problematic documents' }
                  )}
                </h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.handleFailuresExplanation"
                    defaultMessage="If the model fails to produce a prediction, the document will be ingested without the prediction."
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.handleFailuresDescription"
                    defaultMessage="By default, pipeline processing stops on failure. To run the pipeline's remaining processors despite the failure, {ignoreFailure} is set to true. {inferenceDocsLink}."
                    values={{
                      ignoreFailure: <EuiCode>{'ignore_failure'}</EuiCode>,
                      inferenceDocsLink: (
                        <EuiLink external target="_blank" href={links.ingest.pipelineFailure}>
                          Learn more.
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.onFailureDescription"
                    defaultMessage="The {onFailure} configuration shown will be used as a default. It is used to specify a list of processors to run immediately after the inference processor failure and provides information on why the failure occurred. {onFailureDocsLink}"
                    values={{
                      onFailure: <EuiCode>{'on_failure'}</EuiCode>,
                      onFailureDocsLink: (
                        <EuiLink external target="_blank" href={links.ingest.pipelineFailure}>
                          Learn more.
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={7}>
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiFlexGroup direction="column" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiFormRow fullWidth>
                        <EuiSwitch
                          data-test-subj={'mlTrainedModelsInferenceIgnoreFailureSwitch'}
                          label={
                            <FormattedMessage
                              id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.ignoreFailureLabel"
                              defaultMessage="Ignore failure and run the pipeline's remaining processors"
                            />
                          }
                          checked={ignoreFailure}
                          onChange={updateIgnoreFailure}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {ignoreFailure === false ? (
                        <EuiFormRow>
                          <EuiSwitch
                            data-test-subj={'mlTrainedModelsInferenceTakeActionOnFailureSwitch'}
                            label={
                              <EuiFlexItem>
                                <FormattedMessage
                                  id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.noActionOnFailureLabel"
                                  defaultMessage="Take action on failure"
                                />
                              </EuiFlexItem>
                            }
                            checked={takeActionOnFailure}
                            onChange={(e: EuiSwitchEvent) =>
                              handleTakeActionOnFailureChange(e.target.checked)
                            }
                          />
                        </EuiFormRow>
                      ) : null}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {takeActionOnFailure === true && ignoreFailure === false ? (
                    <EuiFormRow
                      fullWidth
                      label={
                        <EuiText size="s">
                          <strong>
                            {i18n.translate(
                              'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.onFailureHeadingLabel',
                              { defaultMessage: 'Actions to take on failure' }
                            )}
                          </strong>
                        </EuiText>
                      }
                      labelAppend={
                        <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              iconType="pencil"
                              size="xs"
                              onClick={() => {
                                setEditOnFailure(!editOnFailure);
                              }}
                            >
                              {editOnFailure ? CANCEL_EDIT_MESSAGE : EDIT_MESSAGE}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            {editOnFailure ? (
                              <SaveChangesButton
                                onClick={updateOnFailure}
                                disabled={isOnFailureValid === false}
                              />
                            ) : null}
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            {editOnFailure ? (
                              <EuiButtonEmpty size="xs" onClick={resetOnFailure}>
                                {i18n.translate(
                                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.resetOnFailureButton',
                                  { defaultMessage: 'Reset' }
                                )}
                              </EuiButtonEmpty>
                            ) : null}
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      }
                      helpText={
                        <FormattedMessage
                          id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.onFailureHelpText"
                          defaultMessage="In case of failure, this configuration stores the document, provides the timestamp at which ingest failed, and the context for the failure."
                        />
                      }
                    >
                      <>
                        {!editOnFailure ? (
                          <EuiCodeBlock
                            data-test-subj="mlTrainedModelsInferenceOnFailureCodeBlock"
                            isCopyable={true}
                            overflowHeight={350}
                            css={{ height: '350px' }}
                          >
                            {JSON.stringify(onFailure, null, 2)}
                          </EuiCodeBlock>
                        ) : null}
                        {editOnFailure ? (
                          <CodeEditor
                            data-test-subj="mlTrainedModelsInferenceOnFailureEditor"
                            height={300}
                            languageId="json"
                            options={{
                              automaticLayout: true,
                              lineNumbers: 'off',
                              tabSize: 2,
                            }}
                            value={onFailureString}
                            onChange={handleOnFailureChange}
                          />
                        ) : null}
                      </>
                    </EuiFormRow>
                  ) : null}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
