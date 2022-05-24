/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount as enzymeMount, MountRendererProps, ReactWrapper } from 'enzyme';
import { RenderOptions, RenderResult, render as reactRender } from '@testing-library/react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { I18nProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import { Connector } from '../../sections/action_connector_form/types';

interface FormTestProviderProps {
  children: React.ReactNode;
  connector: Connector;
}

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

export const createTestFormMount = ({
  connector,
}: {
  connector: FormTestProviderProps['connector'];
}) => {
  const { form } = useForm({ defaultValue: connector });

  const FormWrapper: React.FC<{ children: FormTestProviderProps['children'] }> = ({ children }) => (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );

  const mount = (ui: React.ReactElement, options?: MountRendererProps): ReactWrapper => {
    return enzymeMount(ui, { wrappingComponent: FormWrapper, ...options });
  };

  return {
    form,
    mount,
  };
};

export const createTestFormRenderer = ({
  connector,
}: {
  connector: FormTestProviderProps['connector'];
}) => {
  const { form } = useForm({ defaultValue: connector });

  const FormWrapper: React.FC = ({ children }) => (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );

  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: FormWrapper,
      ...options,
    });
  };

  return {
    form,
    render,
  };
};

const FormTestProviderComponent: React.FC<FormTestProviderProps> = ({ children, connector }) => {
  const { form } = useForm({ defaultValue: connector });

  return <Form form={form}>{children}</Form>;
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
