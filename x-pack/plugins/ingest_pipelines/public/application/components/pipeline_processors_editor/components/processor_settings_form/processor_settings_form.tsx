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
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { Form, FormDataProvider, FormHook } from '../../../../../shared_imports';
import { ProcessorInternal } from '../../types';

import { DocumentationButton } from './documentation_button';
import { getProcessorFormDescriptor } from './map_processor_type_to_form';
import { CommonProcessorFields, ProcessorTypeField } from './processors/common_fields';
import { Custom } from './processors/custom';

export interface Props {
  isOnFailure: boolean;
  processor?: ProcessorInternal;
  form: FormHook;
  onClose: () => void;
  onOpen: () => void;
  esDocsBasePath: string;
}

const updateButtonLabel = i18n.translate(
  'xpack.ingestPipelines.settingsFormOnFailureFlyout.updateButtonLabel',
  { defaultMessage: 'Update' }
);
const addButtonLabel = i18n.translate(
  'xpack.ingestPipelines.settingsFormOnFailureFlyout.addButtonLabel',
  { defaultMessage: 'Add' }
);

const cancelButtonLabel = i18n.translate(
  'xpack.ingestPipelines.settingsFormOnFailureFlyout.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

export const ProcessorSettingsForm: FunctionComponent<Props> = memo(
  ({ processor, form, isOnFailure, onClose, onOpen, esDocsBasePath }) => {
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
        <EuiFlyout size="m" maxWidth={720} onClose={onClose}>
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

                if (type?.length) {
                  const formDescriptor = getProcessorFormDescriptor(type as any);

                  if (formDescriptor?.FieldsComponent) {
                    return (
                      <>
                        <formDescriptor.FieldsComponent />
                        <CommonProcessorFields />
                      </>
                    );
                  }
                  return <Custom defaultOptions={processor?.options} />;
                }

                // If the user has not yet defined a type, we do not show any settings fields
                return null;
              }}
            </FormDataProvider>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose}>{cancelButtonLabel}</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  data-test-subj="submitButton"
                  onClick={() => {
                    form.submit();
                  }}
                >
                  {processor ? updateButtonLabel : addButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </Form>
    );
  },
  (previous, current) => {
    return previous.processor === current.processor;
  }
);
