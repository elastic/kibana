/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';

import { coreMock, themeServiceMock } from 'src/core/public/mocks';

import { securityMock } from '../../../mocks';
import { Providers } from '../users_management_app';
import { CreateUserPage } from './create_user_page';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('CreateUserPage', () => {
  jest.setTimeout(15_000);

  const theme$ = themeServiceMock.createTheme$();

  it('creates user when submitting form and redirects back', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/create'] });
    const authc = securityMock.createSetup().authc;
    coreStart.http.post.mockResolvedValue({});

    const { findByRole, findByLabelText } = render(
      <Providers services={coreStart} theme$={theme$} authc={authc} history={history}>
        <CreateUserPage />
      </Providers>
    );

    fireEvent.change(await findByLabelText('Username'), { target: { value: 'jdoe' } });
    fireEvent.change(await findByLabelText('Password'), { target: { value: 'changeme' } });
    fireEvent.change(await findByLabelText('Confirm password'), {
      target: { value: 'changeme' },
    });
    fireEvent.click(await findByRole('button', { name: 'Create user' }));

    await waitFor(() => {
      expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/users/jdoe', {
        body: JSON.stringify({
          password: 'changeme',
          username: 'jdoe',
          full_name: '',
          email: '',
          roles: [],
        }),
      });
      expect(history.location.pathname).toBe('/');
    });
  });

  it('validates form', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/create'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce([]);
    coreStart.http.get.mockResolvedValueOnce([
      {
        username: 'existing_username',
        full_name: '',
        email: '',
        enabled: true,
        roles: ['superuser'],
      },
    ]);

    const { findAllByText, findByRole, findByLabelText } = render(
      <Providers services={coreStart} theme$={theme$} authc={authc} history={history}>
        <CreateUserPage />
      </Providers>
    );

    fireEvent.click(await findByRole('button', { name: 'Create user' }));

    const alert = await findByRole('alert');
    within(alert).getByText(/Enter a username/i);
    within(alert).getByText(/Enter a password/i);

    fireEvent.change(await findByLabelText('Username'), { target: { value: 'existing_username' } });

    await findAllByText(/User 'existing_username' already exists/i);

    fireEvent.change(await findByLabelText('Username'), {
      target: { value: ' username_with_leading_space' },
    });

    await findAllByText(/Username must not contain leading or trailing spaces/i);

    fireEvent.change(await findByLabelText('Username'), {
      target: { value: 'username_with_trailing_space ' },
    });

    await findAllByText(/Username must not contain leading or trailing spaces/i);

    fireEvent.change(await findByLabelText('Username'), {
      target: { value: '€' },
    });

    await findAllByText(
      /Username must contain only letters, numbers, spaces, punctuation, and symbols/i
    );

    fireEvent.change(await findByLabelText('Password'), { target: { value: '111' } });

    await findAllByText(/Password must be at least 6 characters/i);

    fireEvent.change(await findByLabelText('Password'), { target: { value: '123456' } });
    fireEvent.change(await findByLabelText('Confirm password'), { target: { value: '111' } });

    await findAllByText(/Passwords do not match/i);
  });
});
