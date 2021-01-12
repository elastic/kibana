/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  fireEvent,
  render,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { mockAuthenticatedUser } from '../../../../common/model/authenticated_user.mock';
import { securityMock } from '../../../mocks';
import { Providers } from '../users_management_app';
import { EditUserPage } from './edit_user_page';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const userMock = {
  username: 'jdoe',
  full_name: '',
  email: '',
  enabled: true,
  roles: ['superuser'],
};

describe('EditUserPage', () => {
  it('warns when viewing disabled user', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce({
      ...userMock,
      enabled: false,
    });
    coreStart.http.get.mockResolvedValueOnce([]);

    const { findByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    await findByText(/User is blocked/i);
  });

  it('warns when viewing deprecated user', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce({
      ...userMock,
      metadata: {
        _reserved: true,
        _deprecated: true,
        _deprecated_reason: 'Please use [new_user] instead.',
      },
    });
    coreStart.http.get.mockResolvedValueOnce([]);

    const { findByRole, findByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    await findByText(/User is deprecated/i);
    await findByText(/Please use .new_user. instead/i);

    fireEvent.click(await findByRole('button', { name: 'Back to users' }));

    await waitFor(() => expect(history.location.pathname).toBe('/'));
  });

  it('warns when viewing reserved user', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce({
      ...userMock,
      metadata: { _reserved: true, _deprecated: false },
    });
    coreStart.http.get.mockResolvedValueOnce([]);

    const { findByRole, findByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    await findByText(/User is built-in/i);

    fireEvent.click(await findByRole('button', { name: 'Back to users' }));

    await waitFor(() => expect(history.location.pathname).toBe('/'));
  });

  it('warns when selecting deprecated role', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce({
      ...userMock,
      enabled: false,
      roles: ['deprecated_role'],
    });
    coreStart.http.get.mockResolvedValueOnce([
      {
        name: 'deprecated_role',
        metadata: {
          _reserved: true,
          _deprecated: true,
          _deprecated_reason: 'Please use [new_role] instead.',
        },
      },
    ]);

    const { findByText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    await findByText(/Role .deprecated_role. is deprecated. Please use .new_role. instead/i);
  });

  it('updates user when submitting form and redirects back', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce(userMock);
    coreStart.http.get.mockResolvedValueOnce([]);
    coreStart.http.post.mockResolvedValueOnce({});

    const { findByRole, findByLabelText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    fireEvent.change(await findByLabelText('Full name'), { target: { value: 'John Doe' } });
    fireEvent.change(await findByLabelText('Email address'), {
      target: { value: 'jdoe@elastic.co' },
    });
    fireEvent.click(await findByRole('button', { name: 'Update user' }));

    await waitFor(() => {
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/security/users/jdoe');
      expect(coreStart.http.get).toHaveBeenCalledWith('/api/security/role');
      expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/users/jdoe', {
        body: JSON.stringify({
          ...userMock,
          full_name: 'John Doe',
          email: 'jdoe@elastic.co',
        }),
      });
      expect(history.location.pathname).toBe('/');
    });
  });

  it('changes password of other user when submitting form and closes dialog', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce(userMock);
    coreStart.http.get.mockResolvedValueOnce([]);
    authc.getCurrentUser.mockResolvedValueOnce(
      mockAuthenticatedUser({ ...userMock, username: 'elastic' })
    );
    coreStart.http.post.mockResolvedValueOnce({});

    const { getByRole, findByRole } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    fireEvent.click(await findByRole('button', { name: 'Change password' }));

    const dialog = getByRole('dialog');
    fireEvent.change(await within(dialog).findByLabelText('New password'), {
      target: { value: 'changeme' },
    });
    fireEvent.change(within(dialog).getByLabelText('Confirm password'), {
      target: { value: 'changeme' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change password' }));

    await waitForElementToBeRemoved(() => getByRole('dialog'));
    expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/users/jdoe/password', {
      body: JSON.stringify({
        newPassword: 'changeme',
      }),
    });
  });

  it('changes password of current user when submitting form and closes dialog', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce(userMock);
    coreStart.http.get.mockResolvedValueOnce([]);
    authc.getCurrentUser.mockResolvedValueOnce(mockAuthenticatedUser(userMock));
    coreStart.http.post.mockResolvedValueOnce({});

    const { getByRole, findByRole } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    fireEvent.click(await findByRole('button', { name: 'Change password' }));

    const dialog = await findByRole('dialog');
    fireEvent.change(await within(dialog).findByLabelText('Current password'), {
      target: { value: '123456' },
    });
    fireEvent.change(await within(dialog).findByLabelText('New password'), {
      target: { value: 'changeme' },
    });
    fireEvent.change(await within(dialog).findByLabelText('Confirm password'), {
      target: { value: 'changeme' },
    });
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Change password' }));

    await waitForElementToBeRemoved(() => getByRole('dialog'));
    expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/users/jdoe/password', {
      body: JSON.stringify({
        newPassword: 'changeme',
        password: '123456',
      }),
    });
  });

  it('disables user when confirming and closes dialog', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce(userMock);
    coreStart.http.get.mockResolvedValueOnce([]);
    coreStart.http.post.mockResolvedValueOnce({});

    const { getByRole, findByRole } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    fireEvent.click(await findByRole('button', { name: 'Block user' }));

    const dialog = getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Block user' }));

    await waitForElementToBeRemoved(() => getByRole('dialog'));
    expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/users/jdoe/disable');
  });

  it('enables user when confirming and closes dialog', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce({ ...userMock, enabled: false });
    coreStart.http.get.mockResolvedValueOnce([]);
    coreStart.http.post.mockResolvedValueOnce({});

    const { getByRole, findAllByRole } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    const [enableButton] = await findAllByRole('button', { name: 'Unblock user' });
    fireEvent.click(enableButton);

    const dialog = getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unblock user' }));

    await waitForElementToBeRemoved(() => getByRole('dialog'));
    expect(coreStart.http.post).toHaveBeenLastCalledWith('/internal/security/users/jdoe/enable');
  });

  it('deletes user when confirming and redirects back', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    const authc = securityMock.createSetup().authc;

    coreStart.http.get.mockResolvedValueOnce(userMock);
    coreStart.http.get.mockResolvedValueOnce([]);
    coreStart.http.delete.mockResolvedValueOnce({});

    const { getByRole, findByRole } = render(
      <Providers services={coreStart} authc={authc} history={history}>
        <EditUserPage username={userMock.username} />
      </Providers>
    );

    fireEvent.click(await findByRole('button', { name: 'Delete user' }));

    const dialog = getByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'I understand, permanently delete this user' })
    );

    expect(coreStart.http.delete).toHaveBeenLastCalledWith('/internal/security/users/jdoe');
    await waitFor(() => {
      expect(history.location.pathname).toBe('/');
    });
  });
});
