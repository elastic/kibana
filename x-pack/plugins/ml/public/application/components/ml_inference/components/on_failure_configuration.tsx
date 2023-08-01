/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';

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
  EuiSwitchEvent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { SaveChangesButton } from './save_changes_button';
import type { MlInferenceState } from '../types';
import { getDefaultOnFailureConfiguration } from '../state';
import { cancelEditMessage, editMessage } from '../constants';
import { useMlKibana } from '../../../contexts/kibana';
import { isValidJson } from '../../../../../common/util/validation_utils';

interface Props {
  handleAdvancedConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
  ignoreFailure: boolean;
  onFailure: MlInferenceState['onFailure'];
}

export const OnFailureConfiguration: FC<Props> = ({
  handleAdvancedConfigUpdate,
  ignoreFailure,
  onFailure,
}) => {
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
    handleAdvancedConfigUpdate({ ignoreFailure: e.target.checked });
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

  const resetOnFailure = () => {
    setOnFailureString(JSON.stringify(getDefaultOnFailureConfiguration(), null, 2));
    setIsOnFailureValid(true);
  };

  return (
    <EuiFlexGroup direction="column">
      {/* IGNORE FAILURE */}
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
                  defaultMessage="If the model fails to produce a prediction, e.g., due to the data schema change, the document will be ingested without the prediction."
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.handleFailuresDescription"
                  defaultMessage="By default, pipeline processing stops on failure. To ignore the failure, {ignoreFailure} is set to true. {inferenceDocsLink}."
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
                  defaultMessage="The {onFailure} configuration shown will be used as a default. It is used to specify a list of processors to run immediately after a processor failure and provides information on why the failure occurred. {onFailureDocsLink}"
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
                <EuiFormRow
                  fullWidth
                  labelAppend={
                    <EuiFlexGroup gutterSize="xs" justifyContent="flexStart">
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          iconType="pencil"
                          size="xs"
                          onClick={() => {
                            setEditOnFailure(!editOnFailure);
                          }}
                        >
                          {editOnFailure ? cancelEditMessage : editMessage}
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
                      defaultMessage="In the case of failure, the above configuration will set the index document as failed, provide the timestamp at which ingest failed, and provide context for the failure."
                    />
                  }
                >
                  <>
                    {!editOnFailure ? (
                      <EuiCodeBlock isCopyable={true} overflowHeight={350}>
                        {JSON.stringify(onFailure, null, 2)}
                      </EuiCodeBlock>
                    ) : null}
                    {editOnFailure ? (
                      <>
                        <EuiSpacer size="s" />
                        <CodeEditor
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
                      </>
                    ) : null}
                  </>
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow hasEmptyLabelSpace fullWidth>
                  <EuiSwitch
                    label={
                      <FormattedMessage
                        id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.ignoreFailureLabel"
                        defaultMessage="Ignore failure"
                      />
                    }
                    checked={ignoreFailure}
                    onChange={updateIgnoreFailure}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
