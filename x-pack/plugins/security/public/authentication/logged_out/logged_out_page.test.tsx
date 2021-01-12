/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test/jest';
import { LoggedOutPage } from './logged_out_page';

import { coreMock } from '../../../../../../src/core/public/mocks';

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
