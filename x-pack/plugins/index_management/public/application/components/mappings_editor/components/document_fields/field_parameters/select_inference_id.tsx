/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiSelectableOption,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState, useCallback } from 'react';

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { useComponentTemplatesContext } from '../../../../component_templates/component_templates_context';
import { getFieldConfig } from '../../../lib';
import { useAppContext } from '../../../../../app_context';
import { Form, UseField, useForm, MultiSelectField } from '../../../shared_imports';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { ModelConfig } from '@kbn/inference_integration_flyout/types';
import { FormattedMessage } from '@kbn/i18n-react';
import { InferenceFlyoutWrapper } from '@kbn/inference_integration_flyout/components/inference_flyout_wrapper';

interface Props {
  onChange(value: string): void;
  'data-test-subj'?: string;
}
export const InferenceIdSelects = ({ onChange, 'data-test-subj': dataTestSubj }: Props) => {
  const { docLinks } = useAppContext();
  const { form } = useForm({ defaultValue: { main: 'elser_model_2' } });
  const { subscribe } = form;
  const { api } = useComponentTemplatesContext();

  const [isInferenceFlyoutVisible, setIsInferenceFlyoutVisible] = useState<boolean>(false);
  const [inferenceAddError, setInferenceAddError] = useState<string | undefined>(undefined);

  const fieldConfigModelId = getFieldConfig('inference_id');
  const defaultInferenceIds: EuiSelectableOption[] = [
    { checked: 'on', label: 'elser_model_2' },
    { label: 'e5' },
  ];

  const [options, setOptions] = useState<EuiSelectableOption[]>(defaultInferenceIds);
  const setInferenceModels = async () => {
    const models = await api.getInferenceModels();
    const inferenceIdOptionsFromModels =
      models?.data?.map((model: InferenceAPIConfigResponse) => ({
        label: model.model_id,
      })) || [];
    setOptions([...defaultInferenceIds, ...inferenceIdOptionsFromModels]);
  };
  useEffect(() => {
    setInferenceModels();
  }, [api]);

  const onSaveInferenceCallback = useCallback(
    async (inferenceId: string, taskType: InferenceTaskType, modelConfig: ModelConfig) => {
      try {
        const { error } = await api.createInferenceEndpoint(inferenceId, taskType, modelConfig);
        if (!error) {
          setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
          await setInferenceModels();
        } else {
          setInferenceAddError(error.message);
        }
      } catch (exception) {
        setInferenceAddError(exception.message);
      }
    },
    [isInferenceFlyoutVisible]
  );
  useEffect(() => {
    const subscription = subscribe((updateData) => {
      const formData = updateData.data.internal;
      const value = formData.main;
      onChange(value);
    });

    return subscription.unsubscribe;
  }, [subscribe, onChange]);
  const selectedOptions = options.filter((option) => option.checked).find((k) => k.label);
  const [isInferencePopoverVisible, setIsInferencePopoverVisible] = useState<boolean>(false);
  const inferencePopover = () => {
    return (
      <EuiPopover
        button={
          <>
            <UseField path="main" config={fieldConfigModelId}>
              {(field) => (
                <>
                  <EuiText size="xs">
                    <p>
                      <strong>{field.label}</strong>
                    </p>
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <EuiButton
                    iconType="arrowDown"
                    iconSide="right"
                    color="text"
                    onClick={() => {
                      setIsInferencePopoverVisible(!isInferencePopoverVisible);
                    }}
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.button"
                      defaultMessage="{defaultValue}"
                      values={{ defaultValue: selectedOptions?.label }}
                    />
                  </EuiButton>
                </>
              )}
            </UseField>
          </>
        }
        isOpen={isInferencePopoverVisible}
        panelPaddingSize="m"
        closePopover={() => setIsInferencePopoverVisible(!isInferencePopoverVisible)}
      >
        <EuiContextMenuPanel>
          <EuiContextMenuItem
            key="addInferenceEndpoint"
            icon="plusInCircle"
            size="s"
            data-test-subj="addInferenceEndpointButton"
            onClick={() => {
              setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
              setIsInferencePopoverVisible(!isInferencePopoverVisible);
            }}
          >
            {i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.addInferenceEndpointButton',
              {
                defaultMessage: 'Add inference Endpoint',
              }
            )}
          </EuiContextMenuItem>
          <EuiHorizontalRule margin="none" />
          <EuiContextMenuItem
            key="manageInferenceEndpointButton"
            icon="gear"
            size="s"
            data-test-subj="manageInferenceEndpointButton"
            onClick={() => {}}
          >
            {i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.manageInferenceEndpointButton',
              {
                defaultMessage: 'Manage Inference Endpoint',
              }
            )}
          </EuiContextMenuItem>
        </EuiContextMenuPanel>
        <EuiHorizontalRule margin="none" />
        <EuiPanel color="transparent" paddingSize="s">
          <EuiTitle size="xxxs">
            <h3>
              {i18n.translate(
                'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.selectable.Label',
                {
                  defaultMessage: 'Existing endpoints',
                }
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <UseField path="main">
            {(field) => (
              <>
                <MultiSelectField
                  field={field}
                  euiFieldProps={{
                    options: options,
                    singleSelection: true,
                    searchable: true,
                    height: 100,
                    onChange: setOptions,
                    searchProps: {
                      compressed: true,
                      placeholder: 'Search',
                    },
                  }}
                  data-test-subj={dataTestSubj}
                />
              </>
            )}
          </UseField>
        </EuiPanel>
      </EuiPopover>
    );
  };
  return (
    <Form form={form}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {inferencePopover()}
          {isInferenceFlyoutVisible && (
            <InferenceFlyoutWrapper
              elserv2documentationUrl={docLinks.links.ml.nlpElser}
              e5documentationUrl={docLinks.links.ml.nlpE5}
              onSaveInferenceEndpoint={onSaveInferenceCallback}
              onFlyoutClose={setIsInferenceFlyoutVisible}
              isInferenceFlyoutVisible={isInferenceFlyoutVisible}
              supportedNlpModels={docLinks.links.enterpriseSearch.supportedNlpModels}
              nlpImportModel={docLinks.links.ml.nlpImportModel}
              errorCallout={
                inferenceAddError && (
                  <EuiFlexItem grow={false}>
                    <EuiCallOut
                      color="danger"
                      data-test-subj="addInferenceError"
                      iconType="error"
                      title={i18n.translate(
                        'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.errorTitle',
                        {
                          defaultMessage: 'Error adding inference endpoint',
                        }
                      )}
                    >
                      <EuiText>
                        <FormattedMessage
                          id="xpack.idxMgmt.mappingsEditor.parameters.inferenceId.errorDescription"
                          defaultMessage="Error adding inference endpoint: {errorMessage}"
                          values={{ errorMessage: inferenceAddError }}
                        />
                      </EuiText>
                    </EuiCallOut>
                    <EuiSpacer />
                  </EuiFlexItem>
                )
              }
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.noReferenceModelStartWarningMessage',
              {
                defaultMessage:
                  'The referenced model for this inference endpoint will be started when adding this field.',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
};
