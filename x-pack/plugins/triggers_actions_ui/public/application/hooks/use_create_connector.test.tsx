/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import { useCreateConnector } from './use_create_connector';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useCreateConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.http.post = jest.fn().mockResolvedValue({ id: 'test-id' });
  });

  it('init', async () => {
    const { result } = renderHook(() => useCreateConnector());

    expect(result.current).toEqual({
      isLoading: false,
      createConnector: expect.anything(),
    });
  });

  it('executes correctly', async () => {
    const { result } = renderHook(() => useCreateConnector());

    act(() => {
      result.current.createConnector({
        actionTypeId: '.test',
        name: 'test',
        config: {},
        secrets: {},
      });
    });

    await waitFor(() => null);

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith('/api/actions/connector', {
      body: '{"name":"test","config":{},"secrets":{},"connector_type_id":".test"}',
    });
  });
});
