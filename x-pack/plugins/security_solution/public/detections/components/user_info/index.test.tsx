/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUserInfo, ManageUserInfo } from './index';

import { useKibana } from '../../../common/lib/kibana';
import * as api from '../../containers/detection_engine/alerts/api';

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
      const { result, waitForNextUpdate } = renderHook(() => useUserInfo());
      await waitForNextUpdate();

      expect(result).toEqual({
        current: {
          canUserCRUD: null,
          hasEncryptionKey: null,
          hasIndexManage: null,
          hasIndexWrite: null,
          hasIndexUpdateDelete: null,
          isAuthenticated: null,
          isSignalIndexExists: null,
          loading: true,
          signalIndexName: null,
          signalIndexMappingOutdated: null,
        },
        error: undefined,
      });
    });
  });

  it('calls createSignalIndex if signal index template is outdated', async () => {
    const spyOnCreateSignalIndex = jest.spyOn(api, 'createSignalIndex');
    const spyOnGetSignalIndex = jest.spyOn(api, 'getSignalIndex').mockResolvedValueOnce({
      name: 'mock-signal-index',
      index_mapping_outdated: true,
    });
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useUserInfo(), { wrapper: ManageUserInfo });
      await waitForNextUpdate();
      await waitForNextUpdate();
    });
    expect(spyOnGetSignalIndex).toHaveBeenCalledTimes(2);
    expect(spyOnCreateSignalIndex).toHaveBeenCalledTimes(1);
  });
});
