/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useEffect } from 'react';
import { EuiButton } from '@elastic/eui';

import { Form, useForm, FormDataProvider, OnFormUpdateArg } from '../../../../../shared_imports';

import { PipelineEditorProcessor } from '../../types';

import { getProcessorForm } from './map_processor_type_to_form';
import { CommonProcessorFields, ProcessorTypeField } from './processors/common_fields';

export type ProcessorSettingsFromOnSubmitArg = Omit<PipelineEditorProcessor, 'id'>;

export interface Props {
  processor?: PipelineEditorProcessor;
  onFormUpdate: (form: OnFormUpdateArg<any>) => void;
  onSubmit: (processor: ProcessorSettingsFromOnSubmitArg) => void;
}

export const ProcessorSettingsForm: FunctionComponent<Props> = ({
  processor,
  onSubmit,
  onFormUpdate,
}) => {
  const handleSubmit = (data: any, isValid: boolean) => {
    if (isValid) {
      const { type, ...options } = data;
      onSubmit({
        type,
        options,
      });
    }
  };

  const { form } = useForm({
    defaultValue: processor ? { ...processor.options } : undefined,
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    const subscription = form.subscribe(onFormUpdate);
    return subscription.unsubscribe;
  }, [form, onFormUpdate]);

  return (
    <Form form={form}>
      <ProcessorTypeField initialType={processor?.type} />
      <FormDataProvider pathsToWatch="type">
        {({ type }) => {
          let FormFields: FunctionComponent | null = null;

          if (type) {
            FormFields = getProcessorForm(type as any);

            // TODO: Handle this error in a different way
            if (!FormFields) {
              throw new Error(`Could not find form for type ${type}`);
            }
          }

          return (
            FormFields && (
              <>
                <FormFields />
                <CommonProcessorFields />
                <EuiButton onClick={form.submit}>
                  {i18n.translate(
                    'xpack.ingestPipelines.pipelineEditor.settingsForm.submitButtonLabel',
                    { defaultMessage: 'Submit' }
                  )}
                </EuiButton>
              </>
            )
          );
        }}
      </FormDataProvider>
    </Form>
  );
};
