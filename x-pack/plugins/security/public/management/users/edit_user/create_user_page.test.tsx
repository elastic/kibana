/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { securityMock } from '../../../mocks';
import { Providers } from '../users_management_app';
import { CreateUserPage } from './create_user_page';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('CreateUserPage', () => {
  it('creates user when submitting form and redirects back', async () => {
    const coreStart = coreMock.createStart();
    const history = createMemoryHistory({ initialEntries: ['/create'] });
    const authc = securityMock.createSetup().authc;
    coreStart.http.post.mockResolvedValue({});

    const { findByRole, findByLabelText } = render(
      <Providers services={coreStart} authc={authc} history={history}>
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
});
