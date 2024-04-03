/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty, EuiSpacer, EuiPageSection, EuiPageHeader, EuiInlineEditTitle, EuiInlineEditText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useForm, Form, FormConfig } from '../../../shared_imports';
import { Pipeline, Processor } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';

import { OnUpdateHandlerArg, OnUpdateHandler } from '../pipeline_editor';

import { PipelineRequestFlyout } from './pipeline_request_flyout';
import { PipelineFormFields } from './pipeline_form_fields';
import { PipelineFormError } from './pipeline_form_error';
import { pipelineFormSchema } from './schema';
import { PipelineForm as IPipelineForm } from './types';

export interface PipelineFormProps {
  onSave: (pipeline: Pipeline) => void;
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

const i18nStrings = {
  placeholderPipelineName: i18n.translate('xpack.ingestPipelines.create.placeholderPipelineName', {
    defaultMessage: 'My pipeline name',
  }),
  placeholderPipelineDescription: i18n.translate('xpack.ingestPipelines.create.placeholderPipelineDescription', {
    defaultMessage: 'Add a description',
  }),
};

export const PipelineForm: React.FunctionComponent<PipelineFormProps> = ({
  defaultValue = defaultFormValue,
  onSave,
  isSaving,
  saveError,
  isEditing,
  canEditName,
}) => {
  const { services } = useKibana();
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
      <EuiPageSection paddingSize="none">
        <EuiButton
          data-test-subj="pipelineFormBackButton"
          color="text"
          iconType="arrowLeft"
          onClick={() => null}
        >
          <FormattedMessage
            id="xpack.ingestPipelines.form.backButtonLabel"
            defaultMessage="Back to all pipelines"
          />
        </EuiButton>
      </EuiPageSection>

      <EuiSpacer size="l" />

      <EuiPageHeader bottomBorder>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiInlineEditTitle
              heading="h1"
              size="l"
              inputAriaLabel="Edit title inline"
              defaultValue=""
              placeholder={i18nStrings.placeholderPipelineName}
            />
            <EuiSpacer size="l" />
            <EuiInlineEditText
              size="m"
              inputAriaLabel="Edit description inline"
              defaultValue=""
              placeholder={i18nStrings.placeholderPipelineDescription}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" direction="rowReverse">
              <EuiFlexItem>
                <EuiButton
                  fill
                  onClick={form.submit}
                  data-test-subj="submitButton"
                  disabled={form.isSubmitted && form.isValid === false}
                  isLoading={isSaving}
                >
                  {saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  data-test-subj="showRequestLink"
                  iconType="console"
                  onClick={() => setIsRequestVisible((prevIsRequestVisible) => !prevIsRequestVisible)}
                >
                  <FormattedMessage
                    id="xpack.ingestPipelines.form.showRequestButtonLabel"
                    defaultMessage="Show request"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonEmpty
                  flush="right"
                  href={services.documentation.getCreatePipelineUrl()}
                  target="_blank"
                  data-test-subj="documentationLink"
                >
                  <FormattedMessage
                    id="xpack.ingestPipelines.form.docsButtonLabel"
                    defaultMessage="Documentation"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>

      <EuiSpacer size="l" />

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
          hasMeta={Boolean(defaultValue._meta && Object.keys(defaultValue._meta).length)}
          isEditing={isEditing}
          canEditName={canEditName}
        />

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
