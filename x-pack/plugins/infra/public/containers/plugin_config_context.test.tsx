/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { PluginConfigProvider, usePluginConfig } from './plugin_config_context';

describe('usePluginConfig()', () => {
  it('throws an error if the context value was not set before using the hook', () => {
    const { result } = renderHook(() => usePluginConfig());

    expect(result.error).not.toEqual(undefined);
  });

  it('returns the plugin config what was set through the provider', () => {
    const config = {
      featureFlags: { metricsExplorerEnabled: false },
    };
    const { result } = renderHook(() => usePluginConfig(), {
      wrapper: ({ children }) => {
        return <PluginConfigProvider value={config}>{children}</PluginConfigProvider>;
      },
    });

    expect(result.error).toEqual(undefined);
    expect(result.current).toEqual(config);
  });
});
