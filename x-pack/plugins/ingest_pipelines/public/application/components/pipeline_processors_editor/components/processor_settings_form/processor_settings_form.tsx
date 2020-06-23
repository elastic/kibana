/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent, memo, useEffect } from 'react';
import {
  EuiButton,
  EuiHorizontalRule,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { Form, useForm, FormDataProvider } from '../../../../../shared_imports';
import { usePipelineProcessorsContext } from '../../context';
import { ProcessorInternal } from '../../types';

import { DocumentationButton } from './documentation_button';
import { ProcessorSettingsFromOnSubmitArg } from './processor_settings_form.container';
import { getProcessorFormDescriptor } from './map_processor_type_to_form';
import { CommonProcessorFields, ProcessorTypeField } from './processors/common_fields';
import { Custom } from './processors/custom';

export type OnSubmitHandler = (processor: ProcessorSettingsFromOnSubmitArg) => void;

export interface Props {
  isOnFailure: boolean;
  processor?: ProcessorInternal;
  form: ReturnType<typeof useForm>['form'];
  onClose: () => void;
  onOpen: () => void;
}

export const ProcessorSettingsForm: FunctionComponent<Props> = memo(
  ({ processor, form, isOnFailure, onClose, onOpen }) => {
    const {
      links: { esDocsBasePath },
    } = usePipelineProcessorsContext();

    const flyoutTitleContent = isOnFailure ? (
      <FormattedMessage
        id="xpack.ingestPipelines.settingsFormOnFailureFlyout.title"
        defaultMessage="Configure on-failure processor"
      />
    ) : (
      <FormattedMessage
        id="xpack.ingestPipelines.settingsFormFlyout.title"
        defaultMessage="Configure processor"
      />
    );

    useEffect(
      () => {
        onOpen();
      },
      [] /* eslint-disable-line react-hooks/exhaustive-deps */
    );

    return (
      <Form data-test-subj="processorSettingsForm" form={form}>
        <EuiFlyout onClose={onClose}>
          <EuiFlyoutHeader>
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem>
                <div>
                  <EuiTitle size="m">
                    <h2>{flyoutTitleContent}</h2>
                  </EuiTitle>
                </div>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <FormDataProvider pathsToWatch="type">
                  {({ type }) => {
                    const formDescriptor = getProcessorFormDescriptor(type as any);

                    if (formDescriptor) {
                      return (
                        <DocumentationButton
                          processorLabel={formDescriptor.label}
                          docLink={esDocsBasePath + formDescriptor.docLinkPath}
                        />
                      );
                    }
                    return null;
                  }}
                </FormDataProvider>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ProcessorTypeField initialType={processor?.type} />

            <EuiHorizontalRule />

            <FormDataProvider pathsToWatch="type">
              {(arg: any) => {
                const { type } = arg;
                let formContent: React.ReactNode | undefined;

                if (type?.length) {
                  const formDescriptor = getProcessorFormDescriptor(type as any);

                  if (formDescriptor?.FieldsComponent) {
                    formContent = (
                      <>
                        <formDescriptor.FieldsComponent />
                        <CommonProcessorFields />
                      </>
                    );
                  } else {
                    formContent = <Custom defaultOptions={processor?.options} />;
                  }

                  return (
                    <>
                      {formContent}
                      <EuiButton data-test-subj="submitButton" onClick={form.submit}>
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
          </EuiFlyoutBody>
        </EuiFlyout>
      </Form>
    );
  },
  (previous, current) => {
    return previous.processor === current.processor;
  }
);
