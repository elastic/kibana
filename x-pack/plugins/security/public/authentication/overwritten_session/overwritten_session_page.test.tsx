/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { act } from '@testing-library/react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { OverwrittenSessionPage } from './overwritten_session_page';

import { coreMock } from '../../../../../../src/core/public/mocks';
import { authenticationMock } from '../index.mock';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { AuthenticationStatePage } from '../components/authentication_state_page';

describe('OverwrittenSessionPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://some-host' },
      writable: true,
    });
  });

  it('renders as expected', async () => {
    const basePathMock = coreMock.createStart({ basePath: '/mock-base-path' }).http.basePath;
    const authenticationSetupMock = authenticationMock.createSetup();
    authenticationSetupMock.getCurrentUser.mockResolvedValue(
      mockAuthenticatedUser({ username: 'mock-user' })
    );

    const wrapper = mountWithIntl(
      <OverwrittenSessionPage basePath={basePathMock} authc={authenticationSetupMock} />
    );

    // Shouldn't render anything if username isn't yet available.
    expect(wrapper.isEmptyRender()).toBe(true);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(AuthenticationStatePage)).toMatchSnapshot();
  });

  it('properly parses `next` parameter', async () => {
    window.location.href = `https://host.com/mock-base-path/security/overwritten_session?next=${encodeURIComponent(
      '/mock-base-path/app/home#/?_g=()'
    )}`;

    const basePathMock = coreMock.createStart({ basePath: '/mock-base-path' }).http.basePath;
    const authenticationSetupMock = authenticationMock.createSetup();
    authenticationSetupMock.getCurrentUser.mockResolvedValue(
      mockAuthenticatedUser({ username: 'mock-user' })
    );

    const wrapper = mountWithIntl(
      <OverwrittenSessionPage basePath={basePathMock} authc={authenticationSetupMock} />
    );

    // Shouldn't render anything if username isn't yet available.
    expect(wrapper.isEmptyRender()).toBe(true);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(EuiButton).prop('href')).toBe('/mock-base-path/app/home#/?_g=()');
  });
});
