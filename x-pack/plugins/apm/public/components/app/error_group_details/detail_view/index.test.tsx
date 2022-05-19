/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { mockMoment } from '../../../../utils/test_helpers';
import { DetailView } from '.';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { createMemoryHistory } from 'history';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

const history = createMemoryHistory({
  initialEntries: [
    '/services/opbeans-java/errors/0000?rangeFrom=now-15m&rangeTo=now',
  ],
});

function MockContext({ children }: { children: React.ReactElement }) {
  return (
    <EuiThemeProvider>
      <MockApmPluginContextWrapper history={history}>
        {children}
      </MockApmPluginContextWrapper>
    </EuiThemeProvider>
  );
}

function renderWithMockContext(element: React.ReactElement) {
  return render(element, { wrapper: MockContext });
}

describe('DetailView', () => {
  beforeEach(() => {
    // Avoid timezone issues
    mockMoment();
  });

  it('should render empty state', () => {
    const wrapper = renderWithMockContext(
      <DetailView errorGroup={{} as any} urlParams={{}} kuery="" />
    );
    expect(wrapper.baseElement.innerHTML).toBe('<div></div>');
  });

  it('should render Discover button', () => {
    const errorGroup = {
      occurrencesCount: 10,
      transaction: undefined,
      error: {
        timestamp: {
          us: 0,
        },
        http: { request: { method: 'GET' } },
        url: { full: 'myUrl' },
        service: { name: 'myService' },
        user: { id: 'myUserId' },
        error: { exception: [{ handled: true }] },
        transaction: { id: 'myTransactionId', sampled: true },
      } as any,
    };

    const discoverLink = renderWithMockContext(
      <DetailView errorGroup={errorGroup} urlParams={{}} kuery="" />
    ).getByText(`View 10 occurrences in Discover`);

    expect(discoverLink).toBeInTheDocument();
  });

  it('should render a Summary', () => {
    const errorGroup = {
      occurrencesCount: 10,
      error: {
        service: {
          name: 'opbeans-python',
        },
        error: {},
        timestamp: {
          us: 0,
        },
      } as any,
      transaction: undefined,
    };

    const rendered = renderWithMockContext(
      <DetailView errorGroup={errorGroup} urlParams={{}} kuery="" />
    );

    expect(
      rendered.getByText('1337 minutes ago (mocking 0)')
    ).toBeInTheDocument();
  });

  it('should render tabs', () => {
    const errorGroup = {
      occurrencesCount: 10,
      transaction: undefined,
      error: {
        timestamp: {
          us: 0,
        },
        error: {},
        service: {},
        user: {},
      } as any,
    };

    const rendered = renderWithMockContext(
      <DetailView errorGroup={errorGroup} urlParams={{}} kuery="" />
    );

    expect(rendered.getByText('Exception stack trace')).toBeInTheDocument();

    expect(rendered.getByText('Metadata')).toBeInTheDocument();
  });

  it('should render TabContent', () => {
    const errorGroup = {
      occurrencesCount: 10,
      transaction: undefined,
      error: {
        service: {
          name: 'opbeans-python',
        },
        timestamp: {
          us: 0,
        },
        error: {
          exception: [{ handled: true }],
        },
        context: {},
      } as any,
    };
    const rendered = renderWithMockContext(
      <DetailView errorGroup={errorGroup} urlParams={{}} kuery="" />
    );

    expect(rendered.getByText('No stack trace available.')).toBeInTheDocument();
  });

  it('should render without http request info', () => {
    const errorGroup = {
      occurrencesCount: 10,
      transaction: undefined,
      error: {
        timestamp: {
          us: 0,
        },
        error: {
          exception: [{ handled: true }],
        },
        http: { response: { status_code: 404 } },
        url: { full: 'myUrl' },
        service: { name: 'myService' },
        user: { id: 'myUserId' },
        transaction: { id: 'myTransactionId', sampled: true },
      } as any,
    };
    expect(() =>
      renderWithMockContext(
        <DetailView errorGroup={errorGroup} urlParams={{}} kuery="" />
      )
    ).not.toThrowError();
  });
});
