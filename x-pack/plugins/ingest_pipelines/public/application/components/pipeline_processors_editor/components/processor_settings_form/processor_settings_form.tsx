/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, memo } from 'react';
import { EuiButton, EuiHorizontalRule } from '@elastic/eui';

import { Form, useForm, FormDataProvider } from '../../../../../shared_imports';

import { ProcessorInternal } from '../../types';

import { getProcessorForm } from './map_processor_type_to_form';
import { CommonProcessorFields, ProcessorTypeField } from './processors/common_fields';
import { Custom } from './processors/custom';

export interface Props {
  processor?: ProcessorInternal;
  form: ReturnType<typeof useForm>['form'];
}

export const ProcessorSettingsForm: FunctionComponent<Props> = memo(
  ({ processor, form }) => {
    return (
      <Form form={form}>
        <ProcessorTypeField initialType={processor?.type} />

        <EuiHorizontalRule />

        <FormDataProvider pathsToWatch="type">
          {(arg: any) => {
            const { type } = arg;
            let formContent: React.ReactNode | undefined;

            if (type?.length) {
              const ProcessorFormFields = getProcessorForm(type as any);

              if (ProcessorFormFields) {
                formContent = (
                  <>
                    <ProcessorFormFields />
                    <CommonProcessorFields />
                  </>
                );
              } else {
                formContent = <Custom defaultOptions={processor?.options} />;
              }

              return (
                <>
                  {formContent}
                  <EuiButton onClick={form.submit}>
                    {i18n.translate(
                      'xpack.ingestPipelines.pipelineEditor.settingsForm.submitButtonLabel',
                      { defaultMessage: 'Submit' }
                    )}
                  </EuiButton>
                </>
              );
            }

            // If the user has not yet defined a type, we do not show any settings fields
            return null;
          }}
        </FormDataProvider>
      </Form>
    );
  },
  (previous, current) => {
    return previous.processor === current.processor;
  }
);
