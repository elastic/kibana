/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { render } from 'react-testing-library';

import { mockFirstLastSeenDomainQuery } from '../../../../containers/domains/first_last_seen_domain/mock';
import { FlowTarget } from '../../../../graphql/types';
import { wait } from '../../../../lib/helpers';
import { TestProviders } from '../../../../mock';
import '../../../../mock/ui_settings';

import { FirstLastSeenDomain } from './index';

describe('FirstLastSeen Component', async () => {
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

  const ip = '10.10.10.10';
  const domainName = 'example.com';
  const firstSeen = 'Apr 8, 2019 @ 16:09:40.692';
  const lastSeen = 'Apr 8, 2019 @ 18:35:45.064';

  test('Loading', async () => {
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={mockFirstLastSeenDomainQuery} addTypename={false}>
          <FirstLastSeenDomain
            ip={ip}
            domainName={domainName}
            flowTarget={FlowTarget.source}
            type="first-seen"
          />
        </MockedProvider>
      </TestProviders>
    );
    expect(container.innerHTML).toBe(
      '<span class="euiLoadingSpinner euiLoadingSpinner--medium"></span>'
    );
  });

  test('First Seen', async () => {
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={mockFirstLastSeenDomainQuery} addTypename={false}>
          <FirstLastSeenDomain
            ip={ip}
            domainName={domainName}
            flowTarget={FlowTarget.source}
            type="first-seen"
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();

    expect(container.innerHTML).toBe(
      `<div class="euiText euiText--small"><span class="euiToolTipAnchor">${firstSeen}</span></div>`
    );
  });

  test('Last Seen', async () => {
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={mockFirstLastSeenDomainQuery} addTypename={false}>
          <FirstLastSeenDomain
            ip={ip}
            domainName={domainName}
            flowTarget={FlowTarget.source}
            type="last-seen"
          />
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    expect(container.innerHTML).toBe(
      `<div class="euiText euiText--small"><span class="euiToolTipAnchor">${lastSeen}</span></div>`
    );
  });

  test('First Seen is empty but not Last Seen', async () => {
    const badDateTime = cloneDeep(mockFirstLastSeenDomainQuery);
    badDateTime[0].result.data!.source.DomainFirstLastSeen.firstSeen = null;
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={badDateTime} addTypename={false}>
          <FirstLastSeenDomain
            ip={ip}
            domainName={domainName}
            flowTarget={FlowTarget.source}
            type="last-seen"
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();

    expect(container.innerHTML).toBe(
      `<div class="euiText euiText--small"><span class="euiToolTipAnchor">${lastSeen}</span></div>`
    );
  });

  test('Last Seen is empty but not First Seen', async () => {
    const badDateTime = cloneDeep(mockFirstLastSeenDomainQuery);
    badDateTime[0].result.data!.source.DomainFirstLastSeen.lastSeen = null;
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={badDateTime} addTypename={false}>
          <FirstLastSeenDomain
            ip={ip}
            domainName={domainName}
            flowTarget={FlowTarget.source}
            type="first-seen"
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();

    expect(container.innerHTML).toBe(
      `<div class="euiText euiText--small"><span class="euiToolTipAnchor">${firstSeen}</span></div>`
    );
  });

  test('First Seen With a bad date time string', async () => {
    const badDateTime = cloneDeep(mockFirstLastSeenDomainQuery);
    badDateTime[0].result.data!.source.DomainFirstLastSeen.firstSeen = 'something-invalid';
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={badDateTime} addTypename={false}>
          <FirstLastSeenDomain
            ip={ip}
            domainName={domainName}
            flowTarget={FlowTarget.source}
            type="first-seen"
          />
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    expect(container.textContent).toBe('something-invalid');
  });

  test('Last Seen With a bad date time string', async () => {
    const badDateTime = cloneDeep(mockFirstLastSeenDomainQuery);
    badDateTime[0].result.data!.source.DomainFirstLastSeen.lastSeen = 'something-invalid';
    const { container } = render(
      <TestProviders>
        <MockedProvider mocks={badDateTime} addTypename={false}>
          <FirstLastSeenDomain
            ip={ip}
            domainName={domainName}
            flowTarget={FlowTarget.source}
            type="last-seen"
          />
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    expect(container.textContent).toBe('something-invalid');
  });
});
