/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, memo } from 'react';
import { EuiButton, EuiHorizontalRule } from '@elastic/eui';

import { Form, useForm, FormDataProvider } from '../../../../../shared_imports';
import { usePipelineProcessorsContext } from '../../context';
import { ProcessorInternal } from '../../types';

import { LearnMoreFormLabel } from './learn_more_form_label';
import { getProcessorFormOrDocPath } from './map_processor_type_to_form';
import { CommonProcessorFields, ProcessorTypeField } from './processors/common_fields';
import { Custom } from './processors/custom';

export interface Props {
  processor?: ProcessorInternal;
  form: ReturnType<typeof useForm>['form'];
}

export const ProcessorSettingsForm: FunctionComponent<Props> = memo(
  ({ processor, form }) => {
    const {
      links: { esDocsBasePath },
    } = usePipelineProcessorsContext();
    return (
      <Form form={form}>
        <ProcessorTypeField initialType={processor?.type} />

        <EuiHorizontalRule />

        <FormDataProvider pathsToWatch="type">
          {(arg: any) => {
            const { type } = arg;
            let formContent: React.ReactNode | undefined;

            if (type?.length) {
              const ProcessorFormOrDocPath = getProcessorFormOrDocPath(type as any);

              if (typeof ProcessorFormOrDocPath === 'function') {
                formContent = (
                  <>
                    <ProcessorFormOrDocPath />
                    <CommonProcessorFields />
                  </>
                );
              } else {
                formContent = (
                  <Custom
                    defaultOptions={processor?.options}
                    helpText={
                      typeof ProcessorFormOrDocPath === 'string' ? (
                        <LearnMoreFormLabel
                          processorType={type}
                          docLink={esDocsBasePath + ProcessorFormOrDocPath}
                        />
                      ) : undefined
                    }
                  />
                );
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
