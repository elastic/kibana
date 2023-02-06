/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { of } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import { Form, useForm, FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { ConnectorServices } from '../../types';
import { TriggersAndActionsUiServices } from '../..';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { ConnectorProvider } from '../context/connector_context';

interface FormTestProviderProps {
  children: React.ReactNode;
  defaultValue?: Record<string, unknown>;
  onSubmit?: ({ data, isValid }: { data: FormData; isValid: boolean }) => Promise<void>;
  connectorServices?: ConnectorServices;
}

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

FormTestProviderComponent.displayName = 'FormTestProvider';
export const FormTestProvider = React.memo(FormTestProviderComponent);

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;
export interface AppMockRenderer {
  render: UiRender;
  coreStart: TriggersAndActionsUiServices;
}

export const createAppMockRenderer = (): AppMockRenderer => {
  const services = createStartServicesMock();
  const theme$ = of({ darkMode: false });

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <KibanaThemeProvider theme$={theme$}>{children}</KibanaThemeProvider>
      </KibanaContextProvider>
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
