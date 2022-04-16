/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { LoggedOutPage } from './logged_out_page';

describe('LoggedOutPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://some-host' },
      writable: true,
    });
  });

  it('points to a base path if `next` parameter is not provided', async () => {
    const basePathMock = coreMock.createStart({ basePath: '/mock-base-path' }).http.basePath;
    const wrapper = mountWithIntl(<LoggedOutPage basePath={basePathMock} />);

    expect(wrapper.find(EuiButton).prop('href')).toBe('/mock-base-path/');
  });

  it('properly parses `next` parameter', async () => {
    window.location.href = `https://host.com/mock-base-path/security/logged_out?next=${encodeURIComponent(
      '/mock-base-path/app/home#/?_g=()'
    )}`;

    const basePathMock = coreMock.createStart({ basePath: '/mock-base-path' }).http.basePath;
    const wrapper = mountWithIntl(<LoggedOutPage basePath={basePathMock} />);

    expect(wrapper.find(EuiButton).prop('href')).toBe('/mock-base-path/app/home#/?_g=()');
  });
});
