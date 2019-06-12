/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { render } from 'react-testing-library';

import { LastEventIndexKey } from '../../graphql/types';
import { mockLastEventTimeQuery } from '../../containers/events/last_event_time/mock';
import { wait } from '../../lib/helpers';
import { TestProviders } from '../../mock';

import { LastEventTime } from '.';

describe('Last Event Time Stat', async () => {
  // this is just a little hack to silence a warning that we'll get until react
  // fixes this: https://github.com/facebook/react/pull/14853
  // For us that mean we need to upgrade to 16.9.0
  // and we will be able to do that when we are in master
  // eslint-disable-next-line no-console
  const originalError = console.error;

  beforeAll(() => {
    // eslint-disable-next-line no-console
    console.error = (...args: string[]) => {
      if (/Warning.*not wrapped in act/.test(args[0])) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    // eslint-disable-next-line no-console
    console.error = originalError;
  });

  test('Loading', async () => {
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={mockLastEventTimeQuery} addTypename={false}>
          <LastEventTime indexKey={LastEventIndexKey.hosts} />
        </MockedProvider>
      </TestProviders>
    );
    expect(container.innerHTML).toBe(
      '<span class="euiLoadingSpinner euiLoadingSpinner--medium"></span>'
    );
  });
  test('Last seen', async () => {
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={mockLastEventTimeQuery} addTypename={false}>
          <LastEventTime indexKey={LastEventIndexKey.hosts} />
        </MockedProvider>
      </TestProviders>
    );
    await wait();

    expect(container.innerHTML).toBe(
      '<span class="euiToolTipAnchor">Last Event: 12 days ago</span>'
    );
  });
  test('Bad date time string', async () => {
    const badDateTime = cloneDeep(mockLastEventTimeQuery);
    badDateTime[0].result.data!.source.LastEventTime.lastSeen = 'something-invalid';
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={badDateTime} addTypename={false}>
          <LastEventTime indexKey={LastEventIndexKey.hosts} />
        </MockedProvider>
      </TestProviders>
    );
    await wait();

    expect(container.innerHTML).toBe('something-invalid');
  });
  test('Null time string', async () => {
    const nullDateTime = cloneDeep(mockLastEventTimeQuery);
    nullDateTime[0].result.data!.source.LastEventTime.lastSeen = null;
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={nullDateTime} addTypename={false}>
          <LastEventTime indexKey={LastEventIndexKey.hosts} />
        </MockedProvider>
      </TestProviders>
    );
    await wait();

    expect(container.innerHTML).toBe('--');
  });
});
