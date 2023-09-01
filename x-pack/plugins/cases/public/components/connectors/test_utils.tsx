/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiButton } from '@elastic/eui';

interface MockFormWrapperComponentProps {
  fields?: Record<string, unknown>;
}

export const MockFormWrapperComponent: React.FC<MockFormWrapperComponentProps> = ({
  children,
  fields = {},
}) => {
  const { form } = useForm({
    defaultValue: { fields },
  });

  const onClick = () => {
    form.submit();
  };

  return (
    <Form form={form}>
      {children}
      <EuiButton data-test-subj="submit-form" onClick={onClick} />
    </Form>
  );
};

MockFormWrapperComponent.displayName = 'MockFormWrapper';
