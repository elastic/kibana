/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { act } from 'react-dom/test-utils';
import { ConnectorFormSchema } from '../../sections/action_connector_form/types';
import { ConnectorFormFieldsGlobal } from '../../sections/action_connector_form/connector_form_fields_global';

interface FormTestProviderProps {
  children: React.ReactNode;
  connector: ConnectorFormSchema;
}

const FormTestProviderComponent: React.FC<FormTestProviderProps> = ({ children, connector }) => {
  const { form } = useForm({ defaultValue: connector });

  return (
    <I18nProvider>
      <Form form={form}>
        <ConnectorFormFieldsGlobal canSave={true} />
        {children}
      </Form>
    </I18nProvider>
  );
};

FormTestProviderComponent.displayName = 'FormTestProvider';
export const FormTestProvider = React.memo(FormTestProviderComponent);

export async function waitForComponentToPaint<P = {}>(wrapper: ReactWrapper<P>, amount = 0) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, amount));
    wrapper.update();
  });
}

export const waitForComponentToUpdate = async () =>
  await act(async () => {
    return Promise.resolve();
  });
