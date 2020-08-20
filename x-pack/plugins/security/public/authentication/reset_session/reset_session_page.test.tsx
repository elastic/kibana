/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { act } from '@testing-library/react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ResetSessionPage } from './reset_session_page';

import { coreMock } from '../../../../../../src/core/public/mocks';
import { AuthenticationStatePage } from '../components/authentication_state_page';

describe('ResetSessionPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://some-host' },
      writable: true,
    });
  });

  it('renders as expected', async () => {
    const basePathMock = coreMock.createStart({ basePath: '/mock-base-path' }).http.basePath;

    const wrapper = mountWithIntl(<ResetSessionPage basePath={basePathMock} />);

    await act(async () => {
      wrapper.update();
    });

    expect(wrapper.find(AuthenticationStatePage)).toMatchSnapshot();
  });

  it('properly parses `next` parameter', async () => {
    window.location.search = `?next=${encodeURIComponent('/mock-base-path/app/home#/?_g=()')}`;
    window.location.href = `https://host.com/mock-base-path/security/reset_session${window.location.search}`;

    const basePathMock = coreMock.createStart({ basePath: '/mock-base-path' }).http.basePath;

    const wrapper = mountWithIntl(<ResetSessionPage basePath={basePathMock} />);

    await act(async () => {
      wrapper.update();
    });

    expect(wrapper.find(EuiButton).prop('href')).toBe(
      '/mock-base-path/api/security/logout?next=%2Fmock-base-path%2Fapp%2Fhome%23%2F%3F_g%3D()'
    );
  });
});
