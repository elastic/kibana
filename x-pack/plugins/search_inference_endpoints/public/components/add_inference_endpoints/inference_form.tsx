/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useCallback } from 'react';
import { InferenceServices } from '@kbn/inference-endpoint-ui-common';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useProviders } from '../../hooks/user_providers';
import * as i18n from './translations';
import { useAddEndpoint } from '../../hooks/use_add_endpoint';
import { InferenceEndpoint } from '../../types';

interface InferenceFormProps {
  onSubmitSuccess: (state: boolean) => void;
}
export const InferenceForm: React.FC<InferenceFormProps> = ({ onSubmitSuccess }) => {
  const {
    services: { http },
  } = useKibana();
  const { mutate: addEndpoint } = useAddEndpoint(() => onSubmitSuccess(false));
  const { data: providers } = useProviders(http);
  const { form } = useForm();
  const handleSubmit = useCallback(async () => {
    const { isValid, data } = await form.submit();

    if (isValid) {
      addEndpoint({
        inferenceEndpoint: data as InferenceEndpoint,
      });
      return;
    }
  }, [addEndpoint, form]);

  return providers ? (
    <Form form={form}>
      <InferenceServices providers={providers} />
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="success"
            size="m"
            isLoading={form.isSubmitting}
            disabled={!form.isValid && form.isSubmitted}
            data-test-subj="add-inference-endpoint-submit-button"
            onClick={handleSubmit}
          >
            {i18n.SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  ) : null;
};
