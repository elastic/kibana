/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { useForm, Form, FormConfig } from '../../../shared_imports';
import { Pipeline, Processor } from '../../../../common/types';

import { OnUpdateHandlerArg, OnUpdateHandler } from '../pipeline_editor';

import { PipelineRequestFlyout } from './pipeline_request_flyout';
import { PipelineFormFields } from './pipeline_form_fields';
import { PipelineFormError } from './pipeline_form_error';
import { pipelineFormSchema } from './schema';
import { PipelineForm as IPipelineForm } from './types';

export interface PipelineFormProps {
  onSave: (pipeline: Pipeline) => void;
  onCancel: () => void;
  isSaving: boolean;
  saveError: any;
  defaultValue?: Pipeline;
  isEditing?: boolean;
}

const defaultFormValue: Pipeline = Object.freeze({
  name: '',
  description: '',
  processors: [],
  on_failure: [],
});

export const PipelineForm: React.FunctionComponent<PipelineFormProps> = ({
  defaultValue = defaultFormValue,
  onSave,
  isSaving,
  saveError,
  isEditing,
  onCancel,
}) => {
  const [isRequestVisible, setIsRequestVisible] = useState<boolean>(false);

  const {
    processors: initialProcessors,
    on_failure: initialOnFailureProcessors,
    ...defaultFormValues
  } = defaultValue;

  const [processorsState, setProcessorsState] = useState<{
    processors: Processor[];
    onFailure?: Processor[];
  }>({
    processors: initialProcessors,
    onFailure: initialOnFailureProcessors,
  });

  const processorStateRef = useRef<OnUpdateHandlerArg>();

  const handleSave: FormConfig<IPipelineForm>['onSubmit'] = async (formData, isValid) => {
    if (!isValid) {
      return;
    }

    if (processorStateRef.current) {
      const state = processorStateRef.current;
      if (await state.validate()) {
        onSave({ ...formData, ...state.getData() });
      }
    }
  };

  const { form } = useForm<IPipelineForm>({
    schema: pipelineFormSchema,
    defaultValue: defaultFormValues,
    onSubmit: handleSave,
  });

  const onEditorFlyoutOpen = useCallback(() => {
    setIsRequestVisible(false);
  }, [setIsRequestVisible]);

  const saveButtonLabel = isSaving ? (
    <FormattedMessage
      id="xpack.ingestPipelines.form.savingButtonLabel"
      defaultMessage="Saving..."
    />
  ) : isEditing ? (
    <FormattedMessage
      id="xpack.ingestPipelines.form.saveButtonLabel"
      defaultMessage="Save pipeline"
    />
  ) : (
    <FormattedMessage
      id="xpack.ingestPipelines.form.createButtonLabel"
      defaultMessage="Create pipeline"
    />
  );

  const onProcessorsChangeHandler = useCallback<OnUpdateHandler>(
    (arg) => (processorStateRef.current = arg),
    []
  );

  return (
    <>
      <Form
        form={form}
        data-test-subj="pipelineForm"
        isInvalid={form.isSubmitted && !form.isValid}
        error={form.getErrors()}
      >
        {/* Request error */}
        {saveError && <PipelineFormError error={saveError} />}

        {/* All form fields */}
        <PipelineFormFields
          onLoadJson={({ processors, on_failure: onFailure }) => {
            setProcessorsState({ processors, onFailure });
          }}
          onEditorFlyoutOpen={onEditorFlyoutOpen}
          processors={processorsState.processors}
          onFailure={processorsState.onFailure}
          onProcessorsUpdate={onProcessorsChangeHandler}
          hasVersion={Boolean(defaultValue.version)}
          isEditing={isEditing}
        />

        {/* Form submission */}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="success"
                  iconType="check"
                  onClick={form.submit}
                  data-test-subj="submitButton"
                  disabled={form.isSubmitted && form.isValid === false}
                  isLoading={isSaving}
                >
                  {saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="primary" onClick={onCancel}>
                  <FormattedMessage
                    id="xpack.ingestPipelines.form.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="showRequestLink"
              onClick={() => setIsRequestVisible((prevIsRequestVisible) => !prevIsRequestVisible)}
            >
              {isRequestVisible ? (
                <FormattedMessage
                  id="xpack.ingestPipelines.form.hideRequestButtonLabel"
                  defaultMessage="Hide request"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ingestPipelines.form.showRequestButtonLabel"
                  defaultMessage="Show request"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* ES request flyout */}
        {isRequestVisible ? (
          <PipelineRequestFlyout
            readProcessors={() =>
              processorStateRef.current?.getData() || { processors: [], on_failure: [] }
            }
            closeFlyout={() => setIsRequestVisible((prevIsRequestVisible) => !prevIsRequestVisible)}
          />
        ) : null}
      </Form>

      <EuiSpacer size="m" />
    </>
  );
};
