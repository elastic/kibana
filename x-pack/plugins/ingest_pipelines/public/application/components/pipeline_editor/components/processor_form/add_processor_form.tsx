/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FunctionComponent, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { Form, FormDataProvider, FormHook } from '../../../../../shared_imports';
import { getProcessorDescriptor } from '../shared';

import { DocumentationButton } from './documentation_button';
import { ProcessorSettingsFields } from './processor_settings_fields';
import { Fields } from './processor_form.container';

export interface Props {
  isOnFailure: boolean;
  form: FormHook<Fields>;
  onOpen: () => void;
  esDocsBasePath: string;
  closeFlyout: () => void;
  handleSubmit: (shouldCloseFlyout?: boolean) => Promise<void>;
}

const addButtonLabel = i18n.translate(
  'xpack.ingestPipelines.addProcessorFormOnFailureFlyout.addButtonLabel',
  { defaultMessage: 'Add' }
);

const cancelButtonLabel = i18n.translate(
  'xpack.ingestPipelines.addProcesorFormOnFailureFlyout.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

const getFlyoutTitle = (isOnFailure: boolean) => {
  return isOnFailure ? (
    <FormattedMessage
      id="xpack.ingestPipelines.settingsFormOnFailureFlyout.configureOnFailureTitle"
      defaultMessage="Configure on-failure processor"
    />
  ) : (
    <FormattedMessage
      id="xpack.ingestPipelines.settingsFormOnFailureFlyout.configureTitle"
      defaultMessage="Configure processor"
    />
  );
};

export const AddProcessorForm: FunctionComponent<Props> = ({
  isOnFailure,
  onOpen,
  form,
  esDocsBasePath,
  closeFlyout,
  handleSubmit,
}) => {
  useEffect(
    () => {
      onOpen();
    },
    [] /* eslint-disable-line react-hooks/exhaustive-deps */
  );

  return (
    <Form data-test-subj="addProcessorForm" form={form} onSubmit={handleSubmit}>
      <EuiFlyout size="m" maxWidth={720} onClose={closeFlyout}>
        <EuiFlyoutHeader>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem>
              <div>
                <EuiTitle size="m" data-test-subj="configurePipelineHeader">
                  <h2>{getFlyoutTitle(isOnFailure)}</h2>
                </EuiTitle>
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormDataProvider pathsToWatch="type">
                {({ type }) => {
                  const formDescriptor = getProcessorDescriptor(type as any);

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
          <ProcessorSettingsFields />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={closeFlyout}>{cancelButtonLabel}</EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                disabled={(!form.isValid && form.isSubmitted) || form.isSubmitting}
                data-test-subj="submitButton"
                onClick={async () => {
                  await handleSubmit();
                }}
              >
                {addButtonLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </Form>
  );
};
