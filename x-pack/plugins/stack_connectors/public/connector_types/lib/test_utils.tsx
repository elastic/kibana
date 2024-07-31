/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import { Form, useForm, FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { act } from 'react-dom/test-utils';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';

import { ConnectorServices } from '@kbn/triggers-actions-ui-plugin/public/types';
import { TriggersAndActionsUiServices } from '@kbn/triggers-actions-ui-plugin/public';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';
import { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public/application/sections/action_connector_form/types';
import { ConnectorFormFieldsGlobal } from '@kbn/triggers-actions-ui-plugin/public/application/sections/action_connector_form/connector_form_fields_global';
import { ConnectorProvider } from '@kbn/triggers-actions-ui-plugin/public/application/context/connector_context';

interface FormTestProviderProps {
  children: React.ReactNode;
  defaultValue?: Record<string, unknown>;
  onSubmit?: ({ data, isValid }: { data: FormData; isValid: boolean }) => Promise<void>;
  connectorServices?: ConnectorServices;
}

type ConnectorFormTestProviderProps = Omit<FormTestProviderProps, 'defaultValue'> & {
  connector: ConnectorFormSchema;
};

const ConnectorFormTestProviderComponent: React.FC<ConnectorFormTestProviderProps> = ({
  children,
  connector,
  onSubmit,
  connectorServices,
}) => {
  return (
    <FormTestProviderComponent
      defaultValue={connector}
      onSubmit={onSubmit}
      connectorServices={connectorServices}
    >
      <ConnectorFormFieldsGlobal canSave={true} />
      {children}
    </FormTestProviderComponent>
  );
};

ConnectorFormTestProviderComponent.displayName = 'ConnectorFormTestProvider';
export const ConnectorFormTestProvider = React.memo(ConnectorFormTestProviderComponent);

const AuthFormTestProviderComponent: React.FC<FormTestProviderProps> = ({
  children,
  defaultValue,
  onSubmit,
}) => {
  return (
    <FormTestProviderComponent onSubmit={onSubmit} defaultValue={defaultValue}>
      {children}
    </FormTestProviderComponent>
  );
};

AuthFormTestProviderComponent.displayName = 'AuthFormTestProvider';
export const AuthFormTestProvider = React.memo(AuthFormTestProviderComponent);

const FormTestProviderComponent: React.FC<FormTestProviderProps> = ({
  children,
  defaultValue,
  onSubmit,
  connectorServices = { validateEmailAddresses: jest.fn() },
}) => {
  const { form } = useForm({ defaultValue });
  const { submit } = form;

  const onClick = useCallback(async () => {
    const res = await submit();
    if (onSubmit) {
      onSubmit(res);
    }
  }, [onSubmit, submit]);

  return (
    <I18nProvider>
      <ConnectorProvider value={{ services: connectorServices }}>
        <Form form={form}>{children}</Form>
        <EuiButton data-test-subj="form-test-provide-submit" onClick={onClick} />
      </ConnectorProvider>
    </I18nProvider>
  );
};

export const waitForComponentToUpdate = async () =>
  await act(async () => {
    return Promise.resolve();
  });

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;
export interface AppMockRenderer {
  render: UiRender;
  coreStart: TriggersAndActionsUiServices;
}

export const createAppMockRenderer = (): AppMockRenderer => {
  const services = createStartServicesMock();

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
    </I18nProvider>
  );
  AppWrapper.displayName = 'AppWrapper';
  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper,
      ...options,
    });
  };
  return {
    coreStart: services,
    render,
  };
};
