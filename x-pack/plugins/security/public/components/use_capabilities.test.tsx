/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import type { Capabilities } from '@kbn/core-capabilities-common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { useCapabilities } from './use_capabilities';

describe('useCapabilities', () => {
  it('should return capabilities', async () => {
    const coreStart = coreMock.createStart();

    const { result } = renderHook<PropsWithChildren<Capabilities>, void>(useCapabilities, {
      wrapper: ({ children }) => (
        <KibanaContextProvider services={coreStart}>{children}</KibanaContextProvider>
      ),
    });

    expect(result.current).toEqual(coreStart.application.capabilities);
  });

  it('should return capabilities scoped by feature', async () => {
    const coreStart = coreMock.createStart();
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      users: {
        save: true,
      },
    };

    const { result } = renderHook<PropsWithChildren<Capabilities>, void>(useCapabilities, {
      // @ts-expect-error
      initialProps: 'users',
      wrapper: ({ children }) => (
        <KibanaContextProvider services={coreStart}>{children}</KibanaContextProvider>
      ),
    });

    expect(result.current).toEqual({ save: true });
  });
});
