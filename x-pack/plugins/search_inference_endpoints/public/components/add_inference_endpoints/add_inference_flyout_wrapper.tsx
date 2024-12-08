/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { InferenceServices } from '@kbn/genai-common';
import { useKibana } from '../../hooks/use_kibana';
import { useProviders } from '../../hooks/user_providers';

interface AddInferenceFlyoutWrapperProps {
  setIsAddInferenceFlyoutOpen: (state: boolean) => void;
}

export const AddInferenceFlyoutWrapper: React.FC<AddInferenceFlyoutWrapperProps> = ({
  setIsAddInferenceFlyoutOpen,
}) => {
  // const {
  //   http,
  //   notifications: { toasts },
  // } = useKibana().services;

  const {
    services: { http },
  } = useKibana();

  const { data: providers, isLoading } = useProviders(http);

  const inferenceCreationFlyoutId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });

  const { form } = useForm({
    defaultValue: '',
  });

  return (
    <EuiFlyout
      ownFocus
      onClose={() => setIsAddInferenceFlyoutOpen(false)}
      aria-labelledby={inferenceCreationFlyoutId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={inferenceCreationFlyoutId}>A typical flyout</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {providers ? (
          <Form form={form}>
            <InferenceServices providers={providers} />
          </Form>
        ) : null}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
