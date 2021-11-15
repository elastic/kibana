/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import * as dynamicIndexPattern from '../../../../hooks/use_dynamic_index_pattern';
import { useIndexPattern } from './use_index_pattern';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';

describe('useIndexPattern', () => {
  const create = jest.fn();
  const mockDataService = {
    data: {
      indexPatterns: {
        create,
      },
    },
  };

  const title = 'apm-*';
  jest
    .spyOn(dynamicIndexPattern, 'useDynamicIndexPatternFetcher')
    .mockReturnValue({ indexPattern: { title } } as any);

  it('returns result as expected', async () => {
    const { waitForNextUpdate } = renderHook(() => useIndexPattern(), {
      wrapper: ({ children }) => (
        <MockApmPluginContextWrapper>
          <KibanaContextProvider services={mockDataService}>
            {children}
          </KibanaContextProvider>
        </MockApmPluginContextWrapper>
      ),
    });

    await waitForNextUpdate();

    expect(create).toBeCalledWith({ title });
  });
});
