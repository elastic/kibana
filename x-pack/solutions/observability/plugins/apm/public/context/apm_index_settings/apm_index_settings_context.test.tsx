/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import React, { useContext } from 'react';
import type { ReactNode } from 'react';
import {
  ApmIndexSettingsContext,
  ApmIndexSettingsContextProvider,
} from './apm_index_settings_context';

jest.mock('../../hooks/use_fetcher', () => ({
  useFetcher: () => ({
    data: {
      apmIndexSettings: [
        { configurationName: 'transaction', defaultValue: 'traces-apm*', savedValue: undefined },
      ],
    },
    status: 'success',
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { apmSourcesAccess: { getApmIndexSettings: jest.fn() } } }),
}));

describe('ApmIndexSettingsContext', () => {
  it('provides fetched index settings to consumers', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApmIndexSettingsContextProvider>{children}</ApmIndexSettingsContextProvider>
    );

    const { result } = renderHook(() => useContext(ApmIndexSettingsContext), { wrapper });

    expect(result.current.indexSettings).toBeDefined();
    expect(result.current.indexSettingsStatus).toBe('success');
  });
});
