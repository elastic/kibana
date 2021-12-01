/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import * as dynamicDataView from '../../../../hooks/use_dynamic_data_view';
import { useDataView } from './use_data_view';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';

describe('useDataView', () => {
  const create = jest.fn();
  const mockDataService = {
    data: {
      dataViews: {
        create,
      },
    },
  };

  const title = 'apm-*';
  jest
    .spyOn(dynamicDataView, 'useDynamicDataViewFetcher')
    .mockReturnValue({ dataView: { title } });

  it('returns result as expected', async () => {
    const { waitForNextUpdate } = renderHook(() => useDataView(), {
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
