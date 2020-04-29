/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { useForm, Form, FormConfig } from '../../../shared_imports';
import { Pipeline } from '../../../../common/types';

import { PipelineRequestFlyout } from './pipeline_request_flyout';
import { PipelineTestFlyout } from './pipeline_test_flyout';
import { PipelineFormFields } from './pipeline_form_fields';
import { PipelineFormError } from './pipeline_form_error';
import { pipelineFormSchema } from './schema';

export interface PipelineFormProps {
  onSave: (pipeline: Pipeline) => void;
  onCancel: () => void;
  isSaving: boolean;
  saveError: any;
  defaultValue?: Pipeline;
  isEditing?: boolean;
}

export const PipelineForm: React.FunctionComponent<PipelineFormProps> = ({
  defaultValue = {
    name: '',
    description: '',
    processors: '',
    on_failure: '',
    version: '',
  },
  onSave,
  isSaving,
  saveError,
  isEditing,
  onCancel,
}) => {
  const [isRequestVisible, setIsRequestVisible] = useState<boolean>(false);

  const [isTestingPipeline, setIsTestingPipeline] = useState<boolean>(false);

  const handleSave: FormConfig['onSubmit'] = (formData, isValid) => {
    if (isValid) {
      onSave(formData as Pipeline);
    }
  };

  const handleTestPipelineClick = () => {
    setIsTestingPipeline(true);
  };

  const { form } = useForm({
    schema: pipelineFormSchema,
    defaultValue,
    onSubmit: handleSave,
  });

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

  return (
    <>
      <Form
        form={form}
        data-test-subj="pipelineForm"
        isInvalid={form.isSubmitted && !form.isValid}
        error={form.getErrors()}
      >
        {/* Request error */}
        {saveError && <PipelineFormError errorMessage={saveError.message} />}

        {/* All form fields */}
        <PipelineFormFields
          hasVersion={Boolean(defaultValue.version)}
          isTestButtonDisabled={isTestingPipeline || form.isValid === false}
          onTestPipelineClick={handleTestPipelineClick}
          hasOnFailure={Boolean(defaultValue.on_failure)}
          isEditing={isEditing}
        />

        {/* Form submission */}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="secondary"
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
              onClick={() => setIsRequestVisible(prevIsRequestVisible => !prevIsRequestVisible)}
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
            closeFlyout={() => setIsRequestVisible(prevIsRequestVisible => !prevIsRequestVisible)}
          />
        ) : null}

        {/* Test pipeline flyout */}
        {isTestingPipeline ? (
          <PipelineTestFlyout
            closeFlyout={() => {
              setIsTestingPipeline(prevIsTestingPipeline => !prevIsTestingPipeline);
            }}
          />
        ) : null}
      </Form>

      <EuiSpacer size="m" />
    </>
  );
};
