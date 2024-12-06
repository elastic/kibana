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

import { InferenceAPIConnectorFields } from '@kbn/shared-gen-ai-ui';

interface AIConnectorFlyoutWrapperProps {
  setIsAIConnectorFlyoutOpen: (state: boolean) => void;
}

export const AIConnectorFlyoutWrapper: React.FC<AIConnectorFlyoutWrapperProps> = ({
  setIsAIConnectorFlyoutOpen,
}) => {
  const inferenceCreationFlyoutId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });

  const { form } = useForm({
    defaultValue: '',
  });

  return (
    <EuiFlyout
      ownFocus
      onClose={() => setIsAIConnectorFlyoutOpen(false)}
      aria-labelledby={inferenceCreationFlyoutId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={inferenceCreationFlyoutId}>A typical flyout</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>
            For consistency across the many flyouts, please utilize the following code for
            implementing the flyout with a header.
          </p>
        </EuiText>
        <Form form={form}>
          <InferenceAPIConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => { }}
          />
        </Form>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
