/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, memo } from 'react';

import {
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { ModelItem } from '../../../model_management/models_list';
import { editMessage, cancelEditMessage } from '../constants';
import { validateInferenceConfigType } from '../validation';
import { isValidJson } from '../../../../../common/util/validation_utils';
import { SaveChangesButton } from './save_changes_button';
import { useMlKibana } from '../../../contexts/kibana';
import type { MlInferenceState, InferenceModelTypes } from '../types';
import { AdditionalAdvancedSettings } from './additional_advanced_settings';

function getDefaultFieldMapString(modelInputFields: ModelItem['input']) {
  return JSON.stringify(
    {
      field_map: {
        incoming_field: modelInputFields.field_names[0],
      },
    },
    null,
    2
  );
}

interface Props {
  handleAdvancedConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
  inferenceConfig: ModelItem['inference_config'];
  modelInferenceConfig: ModelItem['inference_config'];
  modelInputFields: ModelItem['input'];
  inferenceConfigError?: string;
  fieldMapError?: string;
  modelType?: InferenceModelTypes;
}

export const AdvancedConfiguration: FC<Props> = memo(
  ({
    handleAdvancedConfigUpdate,
    inferenceConfig,
    modelInputFields,
    modelInferenceConfig,
    inferenceConfigError,
    fieldMapError,
    modelType,
  }) => {
    const {
      services: {
        docLinks: { links },
      },
    } = useMlKibana();

    const [editInferenceConfig, setEditInferenceConfig] = useState(false);
    const [editFieldMapping, setEditFieldMapping] = useState(false);
    const [inferenceConfigString, setInferenceConfigString] = useState<string>(
      JSON.stringify(inferenceConfig, null, 2)
    );
    const [inferenceConfigModelTypeError, setInferenceConfigModelTypeError] = useState<
      string | undefined
    >();
    const [fieldMappingString, setFieldMappingString] = useState<string>(
      getDefaultFieldMapString(modelInputFields)
    );
    const [isInferenceConfigValid, setIsInferenceConfigValid] = useState<boolean>(true);
    const [isFieldMapValid, setIsFieldMapValid] = useState<boolean>(true);

    const handleInferenceConfigChange = (json: string) => {
      setInferenceConfigString(json);
      const valid = isValidJson(json);
      setIsInferenceConfigValid(valid);
    };

    const updateInferenceConfig = () => {
      const invalidInferenceConfigMessage = validateInferenceConfigType(
        JSON.parse(inferenceConfigString),
        modelType
      );

      if (invalidInferenceConfigMessage === undefined) {
        handleAdvancedConfigUpdate({ inferenceConfig: JSON.parse(inferenceConfigString) });
        setEditInferenceConfig(false);
        setInferenceConfigModelTypeError(undefined);
      } else {
        setIsInferenceConfigValid(false);
        setInferenceConfigModelTypeError(invalidInferenceConfigMessage);
      }
    };

    const resetInferenceConfig = () => {
      setInferenceConfigString(JSON.stringify(modelInferenceConfig, null, 2));
      setIsInferenceConfigValid(true);
      setInferenceConfigModelTypeError(undefined);
    };

    const handleFieldMapChange = (json: string) => {
      setFieldMappingString(json);
      const valid = isValidJson(json);
      setIsFieldMapValid(valid);
    };

    const updateFieldMap = () => {
      handleAdvancedConfigUpdate({ fieldMap: JSON.parse(fieldMappingString) });
      setEditFieldMapping(false);
    };

    return (
      <EuiFlexGroup direction="column">
        {/* INFERENCE CONFIG */}
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={3}>
              <EuiTitle size="s">
                <h4>
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.inferenceConfigurationTitle',
                    { defaultMessage: 'Inference configuration' }
                  )}
                </h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s">
                <p>
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.description',
                    {
                      defaultMessage:
                        'Contains the inference type and its options. The default settings defined in the model configuration are used if this is not specified.',
                    }
                  )}
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.classificationDescriptionExample"
                    defaultMessage="For a classification model, for example, if {numTopClasses} is set to 2, the number of categories for which the predicted probabilities are reported is 2."
                    values={{ numTopClasses: <EuiCode>{'num_top_classes'}</EuiCode> }}
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={7}>
              <EuiFormRow
                fullWidth
                labelAppend={
                  <EuiFlexGroup gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        iconType="pencil"
                        size="xs"
                        onClick={() => {
                          if (!editInferenceConfig === false) {
                            setInferenceConfigModelTypeError(undefined);
                            setIsInferenceConfigValid(true);
                          }
                          setEditInferenceConfig(!editInferenceConfig);
                        }}
                      >
                        {editInferenceConfig ? cancelEditMessage : editMessage}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {editInferenceConfig ? (
                        <SaveChangesButton
                          onClick={updateInferenceConfig}
                          disabled={isInferenceConfigValid === false}
                        />
                      ) : null}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {editInferenceConfig ? (
                        <EuiButtonEmpty size="xs" onClick={resetInferenceConfig}>
                          {i18n.translate(
                            'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.resetInferenceConfigButton',
                            { defaultMessage: 'Reset' }
                          )}
                        </EuiButtonEmpty>
                      ) : null}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                error={inferenceConfigError ?? inferenceConfigModelTypeError}
                isInvalid={
                  inferenceConfigError !== undefined || inferenceConfigModelTypeError !== undefined
                }
              >
                {editInferenceConfig ? (
                  <CodeEditor
                    height={300}
                    languageId="json"
                    options={{
                      automaticLayout: true,
                      lineNumbers: 'off',
                      tabSize: 2,
                    }}
                    value={inferenceConfigString}
                    onChange={handleInferenceConfigChange}
                  />
                ) : (
                  <EuiCodeBlock isCopyable={true}>
                    {JSON.stringify(inferenceConfig, null, 2)}
                  </EuiCodeBlock>
                )}
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {/* FIELD MAP */}
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={3}>
              <EuiTitle size="s">
                <h4>
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.fieldMapTitle',
                    { defaultMessage: 'Field map' }
                  )}
                </h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.fieldMapDescription"
                    defaultMessage="Listed here are the fields the model expects. These are the fields the inference processor will default to if no {fieldMap} is specified."
                    values={{ fieldMap: <EuiCode>{'field_map'}</EuiCode> }}
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.fieldMapExtendedDescription"
                    defaultMessage="The {fieldMap} maps the input document field name to the name of the field that the model expects. It should be in JSON format. This is only needed if the fields for incoming data differ from the expected fields. "
                    values={{ fieldMap: <EuiCode>{'field_map'}</EuiCode> }}
                  />
                </p>
                <EuiSpacer size="m" />
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.inferenceDocsLink"
                    defaultMessage="Learn more about these inference processor settings in the {inferenceDocsLink}."
                    values={{
                      inferenceDocsLink: (
                        <EuiLink external target="_blank" href={links.ingest.inference}>
                          docs
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={7}>
              <EuiFlexGroup>
                <EuiFlexItem grow={5}>
                  <EuiFormRow
                    fullWidth
                    labelAppend={
                      <EuiFlexGroup gutterSize="xs" justifyContent="flexStart">
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            iconType="pencil"
                            size="xs"
                            onClick={() => {
                              setEditFieldMapping(!editFieldMapping);
                            }}
                          >
                            {editFieldMapping ? cancelEditMessage : editMessage}
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <></>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    }
                  >
                    <EuiCodeBlock isCopyable={true} overflowHeight={350}>
                      {JSON.stringify(modelInputFields, null, 2)}
                    </EuiCodeBlock>
                  </EuiFormRow>
                </EuiFlexItem>
                {editFieldMapping ? (
                  <EuiFlexItem grow={5}>
                    <EuiFormRow
                      fullWidth
                      labelAppend={
                        <SaveChangesButton
                          onClick={updateFieldMap}
                          disabled={isFieldMapValid === false}
                        />
                      }
                      error={fieldMapError}
                      isInvalid={fieldMapError !== undefined}
                    >
                      <CodeEditor
                        height={300}
                        languageId="json"
                        options={{
                          automaticLayout: true,
                          lineNumbers: 'off',
                          tabSize: 2,
                        }}
                        value={fieldMappingString}
                        onChange={handleFieldMapChange}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {/* ADDITIONAL ADVANCED SETTINGS */}
        <EuiFlexItem>
          <AdditionalAdvancedSettings handleAdvancedConfigUpdate={handleAdvancedConfigUpdate} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
