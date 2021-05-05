/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUserInfo, ManageUserInfo } from './index';

import { useKibana } from '../../../common/lib/kibana';
import * as api from '../../containers/detection_engine/alerts/api';
import { TestProviders } from '../../../common/mock/test_providers';
import React from 'react';

jest.mock('../../../common/lib/kibana');
jest.mock('../../containers/detection_engine/alerts/api');

describe('useUserInfo', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            siem: {
              crud: true,
            },
          },
        },
      },
    });
  });
  it('returns default state', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useUserInfo(), {
        wrapper: TestProviders,
      });
      await waitForNextUpdate();

      expect(result.all).toHaveLength(1);
      expect(result.current).toEqual({
        canUserCRUD: null,
        hasEncryptionKey: null,
        hasIndexManage: null,
        hasIndexMaintenance: null,
        hasIndexWrite: null,
        hasIndexUpdateDelete: null,
        isAuthenticated: null,
        isSignalIndexExists: null,
        loading: true,
        signalIndexName: null,
        signalIndexMappingOutdated: null,
      });
      expect(result.error).toBeUndefined();
    });
  });

  it('calls createSignalIndex if signal index template is outdated', async () => {
    const spyOnCreateSignalIndex = jest.spyOn(api, 'createSignalIndex');
    const spyOnGetSignalIndex = jest.spyOn(api, 'getSignalIndex').mockResolvedValueOnce({
      name: 'mock-signal-index',
      index_mapping_outdated: true,
    });
    const wrapper = ({ children }: { children: JSX.Element }) => (
      <TestProviders>
        <ManageUserInfo>{children}</ManageUserInfo>
      </TestProviders>
    );
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useUserInfo(), { wrapper });
      await waitForNextUpdate();
      await waitForNextUpdate();
    });
    expect(spyOnGetSignalIndex).toHaveBeenCalledTimes(2);
    expect(spyOnCreateSignalIndex).toHaveBeenCalledTimes(1);
  });
});
