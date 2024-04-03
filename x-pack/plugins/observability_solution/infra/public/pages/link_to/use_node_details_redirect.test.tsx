/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useNodeDetailsRedirect } from './use_node_details_redirect';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const coreStartMock = coreMock.createStart();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({
    pathname: '',
    search: '',
  })),
}));

const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <KibanaContextProvider services={{ ...coreStartMock }}>{children}</KibanaContextProvider>
);

describe('useNodeDetailsRedirect', () => {
  it('should return the LinkProperties for assetType pod', () => {
    const { result } = renderHook(() => useNodeDetailsRedirect(), { wrapper });

    const fromDateStrig = '2019-01-01T11:00:00Z';
    const toDateStrig = '2019-01-01T12:00:00Z';

    expect(
      result.current.getNodeDetailUrl({
        assetType: 'pod',
        assetId: 'example-01',
        search: {
          from: new Date(fromDateStrig).getTime(),
          to: new Date(toDateStrig).getTime(),
        },
      })
    ).toStrictEqual({
      app: 'metrics',
      pathname: 'link-to/pod-detail/example-01',
      search: { from: '1546340400000', to: '1546344000000' },
      state: {},
    });
  });

  it('should return the LinkProperties for assetType host', () => {
    const { result } = renderHook(() => useNodeDetailsRedirect(), { wrapper });

    const fromDateStrig = '2019-01-01T11:00:00Z';
    const toDateStrig = '2019-01-01T12:00:00Z';

    expect(
      result.current.getNodeDetailUrl({
        assetType: 'host',
        assetId: 'example-01',
        search: {
          from: new Date(fromDateStrig).getTime(),
          to: new Date(toDateStrig).getTime(),
          name: 'example-01',
        },
      })
    ).toStrictEqual({
      app: 'metrics',
      pathname: 'link-to/host-detail/example-01',
      search: {
        from: '1546340400000',
        to: '1546344000000',
        assetDetails: '(name:example-01)',
      },
      state: {},
    });
  });
});
