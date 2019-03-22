/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { render } from 'react-testing-library';

import { mockFirstLastSeenHostQuery } from '../../../../containers/hosts/first_last_seen/mock';
import { wait } from '../../../../lib/helpers';
import { TestProviders } from '../../../../mock';

import { FirstLastSeenHost } from '.';

describe('FirstLastSeen Component', async () => {
  // this is just a little hack to silence a warning that we'll get until react
  // fixes this: https://github.com/facebook/react/pull/14853
  // For us that mean we need to upgrade to 16.9.0
  // and we will be able to do that when we are in master
  // tslint:disable-next-line:no-console
  const originalError = console.error;
  beforeAll(() => {
    // tslint:disable-next-line:no-console
    console.error = (...args: string[]) => {
      if (/Warning.*not wrapped in act/.test(args[0])) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    // tslint:disable-next-line:no-console
    console.error = originalError;
  });

  test('Loading', async () => {
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={mockFirstLastSeenHostQuery} addTypename={false}>
          <FirstLastSeenHost hostname="kibana-siem" type="first-seen" />
        </MockedProvider>
      </TestProviders>
    );
    expect(container.innerHTML).toBe(
      '<div class="euiLoadingSpinner euiLoadingSpinner--medium"></div>'
    );
  });

  test('First Seen', async () => {
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={mockFirstLastSeenHostQuery} addTypename={false}>
          <FirstLastSeenHost hostname="kibana-siem" type="first-seen" />
        </MockedProvider>
      </TestProviders>
    );

    await wait();

    expect(container.innerHTML).toBe(
      '<span class="euiToolTipAnchor">Apr 8, 2019 @ 16:09:40.692</span>'
    );
  });

  test('Last Seen', async () => {
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={mockFirstLastSeenHostQuery} addTypename={false}>
          <FirstLastSeenHost hostname="kibana-siem" type="last-seen" />
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    expect(container.innerHTML).toBe(
      '<span class="euiToolTipAnchor">Apr 8, 2019 @ 18:35:45.064</span>'
    );
  });

  test('Show error message', async () => {
    const myErrorMock = cloneDeep(mockFirstLastSeenHostQuery);
    delete myErrorMock[0].result;
    myErrorMock[0].result = {
      errors: [{ message: 'Error!' }],
    };
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={myErrorMock} addTypename={false}>
          <FirstLastSeenHost hostname="kibana-siem" type="last-seen" />
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    expect(container.innerHTML).toBe('GraphQL error: Error!');
  });
});
