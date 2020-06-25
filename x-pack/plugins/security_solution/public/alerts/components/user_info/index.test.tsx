/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useUserInfo } from './index';

import { usePrivilegeUser } from '../../containers/detection_engine/alerts/use_privilege_user';
import { useSignalIndex } from '../../containers/detection_engine/alerts/use_signal_index';
import { useKibana } from '../../../common/lib/kibana';
jest.mock('../../containers/detection_engine/alerts/use_privilege_user');
jest.mock('../../containers/detection_engine/alerts/use_signal_index');
jest.mock('../../../common/lib/kibana');

describe('useUserInfo', () => {
  beforeAll(() => {
    (usePrivilegeUser as jest.Mock).mockReturnValue({});
    (useSignalIndex as jest.Mock).mockReturnValue({});
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
  it('returns default state', () => {
    const { result } = renderHook(() => useUserInfo());

    expect(result).toEqual({
      current: {
        canUserCRUD: null,
        hasEncryptionKey: null,
        hasIndexManage: null,
        hasIndexWrite: null,
        isAuthenticated: null,
        isSignalIndexExists: null,
        loading: true,
        signalIndexName: null,
      },
      error: undefined,
    });
  });
});
