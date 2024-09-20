/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { ChromeBadge } from './use_badge';
import { useBadge } from './use_badge';

describe('useBadge', () => {
  it('should add badge to chrome', async () => {
    const coreStart = coreMock.createStart();
    const badge: React.PropsWithChildren<ChromeBadge> = {
      text: 'text',
      tooltip: 'text',
    };
    renderHook(useBadge, {
      initialProps: badge,
      wrapper: ({ children }) => (
        <KibanaContextProvider services={coreStart}>{children}</KibanaContextProvider>
      ),
    });

    expect(coreStart.chrome.setBadge).toHaveBeenLastCalledWith(badge);
  });

  it('should remove badge from chrome on unmount', async () => {
    const coreStart = coreMock.createStart();
    const badge: React.PropsWithChildren<ChromeBadge> = {
      text: 'text',
      tooltip: 'text',
    };
    const { unmount } = renderHook(useBadge, {
      initialProps: badge,
      wrapper: ({ children }) => (
        <KibanaContextProvider services={coreStart}>{children}</KibanaContextProvider>
      ),
    });

    expect(coreStart.chrome.setBadge).toHaveBeenLastCalledWith(badge);

    unmount();

    expect(coreStart.chrome.setBadge).toHaveBeenLastCalledWith();
  });

  it('should update chrome when badge changes', async () => {
    const coreStart = coreMock.createStart();
    const badge1: React.PropsWithChildren<ChromeBadge> = {
      text: 'text',
      tooltip: 'text',
    };
    const { rerender } = renderHook(useBadge, {
      initialProps: badge1,
      wrapper: ({ children }) => (
        <KibanaContextProvider services={coreStart}>{children}</KibanaContextProvider>
      ),
    });

    expect(coreStart.chrome.setBadge).toHaveBeenLastCalledWith(badge1);

    const badge2: ChromeBadge = {
      text: 'text2',
      tooltip: 'text2',
    };
    rerender(badge2);

    expect(coreStart.chrome.setBadge).toHaveBeenLastCalledWith(badge2);
  });
});
