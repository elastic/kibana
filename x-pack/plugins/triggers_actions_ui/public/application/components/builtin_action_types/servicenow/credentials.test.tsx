/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Credentials } from './credentials';
import { ServiceNowActionConnector } from './types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
jest.mock('../../../../common/lib/kibana');

const editActionConfigMock = jest.fn();
const editActionSecretsMock = jest.fn();

const basicAuthConnector: ServiceNowActionConnector = {
  secrets: { username: 'test', password: 'test' },
  config: { isOAuth: false, apiUrl: 'https://example.com', usesTableApi: false },
} as ServiceNowActionConnector;

describe('Credentials', () => {
  it('renders basic auth form', async () => {
    render(
      <IntlProvider locale="en">
        <Credentials
          action={basicAuthConnector}
          errors={{}}
          readOnly={false}
          isLoading={false}
          editActionSecrets={() => {}}
          editActionConfig={() => {}}
        />
      </IntlProvider>
    );
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect((await screen.findByRole('switch')).getAttribute('aria-checked')).toEqual('false');
    expect(screen.getByLabelText('ServiceNow instance URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    expect(screen.queryByLabelText('Client ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('User Identifier')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('JWT Verifier Key ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Client Secret')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Private Key')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Private Key Password')).not.toBeInTheDocument();
  });

  it('switches to oauth form', async () => {
    render(
      <IntlProvider locale="en">
        <Credentials
          action={basicAuthConnector}
          errors={{}}
          readOnly={false}
          isLoading={false}
          editActionSecrets={editActionSecretsMock}
          editActionConfig={editActionConfigMock}
        />
      </IntlProvider>
    );

    fireEvent.click(screen.getByRole('switch'));

    expect(editActionConfigMock).toHaveBeenCalledWith('isOAuth', true);
    expect(editActionSecretsMock).toHaveBeenCalledWith('username', null);
    expect(editActionSecretsMock).toHaveBeenCalledWith('password', null);

    expect((await screen.findByRole('switch')).getAttribute('aria-checked')).toEqual('true');

    expect(screen.getByLabelText('ServiceNow instance URL')).toBeInTheDocument();
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    expect(screen.getByLabelText('Client ID')).toBeInTheDocument();
    expect(screen.getByLabelText('User Identifier')).toBeInTheDocument();
    expect(screen.getByLabelText('JWT Verifier Key ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Client Secret')).toBeInTheDocument();
    expect(screen.getByLabelText('Private Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Private Key Password')).toBeInTheDocument();
  });
});
