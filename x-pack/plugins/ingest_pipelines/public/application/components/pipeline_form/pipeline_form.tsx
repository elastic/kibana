/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { Pipeline, Processor } from '../../../../common/types';
import { useForm, Form, FormConfig, useFormIsModified } from '../../../shared_imports';

import { useKibana } from '../../../shared_imports';
import { OnUpdateHandlerArg, OnUpdateHandler } from '../pipeline_editor';

import { deepEqualIgnoreUndefined } from './utils';
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
  // That fields is used to disable the name field when creating a pipeline with the name prepopulated
  canEditName?: boolean;
}

const defaultFormValue: Pipeline = Object.freeze({
  name: '',
  description: '',
  processors: [],
  on_failure: [],
  _meta: {},
});

export const PipelineForm: React.FunctionComponent<PipelineFormProps> = ({
  defaultValue = defaultFormValue,
  onSave,
  isSaving,
  saveError,
  isEditing,
  onCancel,
  canEditName,
}) => {
  const {
    overlays,
    history,
    application: { navigateToUrl },
    http,
  } = useKibana().services;

  const [isRequestVisible, setIsRequestVisible] = useState<boolean>(false);
  const [areProcessorsDirty, setAreProcessorsDirty] = useState<boolean>(false);
  const [hasSubmittedForm, setHasSubmittedForm] = useState<boolean>(false);

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
        // We only want to show unsaved changed prompts to the user when the form
        // hasnt been submitted.
        setHasSubmittedForm(true);

        // Save the form state, this will also trigger a redirect to pipelines list
        onSave({ ...formData, ...state.getData() });
      }
    }
  };

  const { form } = useForm<IPipelineForm>({
    schema: pipelineFormSchema,
    defaultValue: defaultFormValues,
    onSubmit: handleSave,
  });

  const isFormDirty = useFormIsModified({ form });

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
    (arg) => {
      processorStateRef.current = arg;

      const currentProcessorsState = processorStateRef.current?.getData();

      // Calculate if the current processor state has changed compared to the
      // initial processors state.
      setAreProcessorsDirty(
        !deepEqualIgnoreUndefined(
          {
            processors: processorsState?.processors || [],
            onFailure: processorsState?.onFailure || [],
          },
          {
            processors: currentProcessorsState?.processors || [],
            onFailure: currentProcessorsState?.on_failure || [],
          }
        )
      );
    },
    [processorsState]
  );

  /*
    We need to check if the form is dirty and also if the form has been submitted.
    Because on form submission we also redirect the user to the pipelines list,
    and this could otherwise trigger an unwanted unsaved changes prompt.
  */
  useUnsavedChangesPrompt({
    titleText: i18n.translate('xpack.ingestPipelines.form.unsavedPrompt.title', {
      defaultMessage: 'Exit without saving changes?',
    }),
    messageText: i18n.translate('xpack.ingestPipelines.form.unsavedPrompt.body', {
      defaultMessage:
        'The data will be lost if you leave this page without saving the pipeline changes.',
    }),
    hasUnsavedChanges: (isFormDirty || areProcessorsDirty) && !hasSubmittedForm,
    openConfirm: overlays.openConfirm,
    history,
    http,
    navigateToUrl,
  });

  return (
    <>
      <Form
        form={form}
        data-test-subj="pipelineForm"
        isInvalid={form.isSubmitted && !form.isValid && !form.isSubmitting}
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
          hasMeta={Boolean(defaultValue._meta && Object.keys(defaultValue._meta).length)}
          isEditing={isEditing}
          canEditName={canEditName}
        />

        <EuiSpacer size="xl" />

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
