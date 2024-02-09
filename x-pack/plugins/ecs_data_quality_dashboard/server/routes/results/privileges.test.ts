/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import { requestContextMock } from '../../__mocks__/request_context';
import { checkIndicesPrivileges } from './privileges';

// const mockHasPrivileges =
//   context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges;
// mockHasPrivileges.mockResolvedValueOnce({
//   has_all_requested: true,
// } as unknown as SecurityHasPrivilegesResponse);

describe('checkIndicesPrivileges', () => {
  const { context } = requestContextMock.createTools();
  const { client } = context.core.elasticsearch;

  beforeEach(() => {
    client.asCurrentUser.security.hasPrivileges.mockResolvedValue({
      index: {
        index1: {
          read: true,
          view_index_metadata: true,
          manage: true,
          monitor: true,
        },
        index2: {
          read: true,
          view_index_metadata: true,
          manage: true,
          monitor: true,
        },
      },
    } as unknown as SecurityHasPrivilegesResponse);
  });

  it('should return true if user has required privileges', async () => {
    const result = await checkIndicesPrivileges({ client, indices: ['index1', 'index2'] });
    expect(result).toEqual({ index1: true, index2: true });
  });

  it('should return true if only monitor privileges is missing', async () => {
    client.asCurrentUser.security.hasPrivileges.mockResolvedValueOnce({
      index: {
        index1: {
          read: true,
          view_index_metadata: true,
          manage: true,
          monitor: false,
        },
      },
    } as unknown as SecurityHasPrivilegesResponse);
    const result = await checkIndicesPrivileges({ client, indices: ['index1'] });

    expect(result).toEqual({ index1: true });
  });

  it('should return true if only manage privileges is missing', async () => {
    client.asCurrentUser.security.hasPrivileges.mockResolvedValueOnce({
      index: {
        index1: {
          read: true,
          view_index_metadata: true,
          manage: false,
          monitor: true,
        },
      },
    } as unknown as SecurityHasPrivilegesResponse);

    const result = await checkIndicesPrivileges({ client, indices: ['index1'] });

    expect(result).toEqual({ index1: true });
  });

  it('should return false if both manage and monitor privileges is missing', async () => {
    client.asCurrentUser.security.hasPrivileges.mockResolvedValueOnce({
      index: {
        index1: {
          read: true,
          view_index_metadata: true,
          manage: false,
          monitor: false,
        },
      },
    } as unknown as SecurityHasPrivilegesResponse);

    const result = await checkIndicesPrivileges({ client, indices: ['index1'] });

    expect(result).toEqual({ index1: false });
  });

  it('should return false if only read privilege is missing', async () => {
    client.asCurrentUser.security.hasPrivileges.mockResolvedValueOnce({
      index: {
        index1: {
          read: false,
          view_index_metadata: true,
          manage: true,
          monitor: true,
        },
      },
    } as unknown as SecurityHasPrivilegesResponse);

    const result = await checkIndicesPrivileges({ client, indices: ['index1'] });

    expect(result).toEqual({ index1: false });
  });

  it('should return false if only view_index_metadata privilege is missing', async () => {
    client.asCurrentUser.security.hasPrivileges.mockResolvedValueOnce({
      index: {
        index1: {
          read: true,
          view_index_metadata: false,
          manage: true,
          monitor: true,
        },
      },
    } as unknown as SecurityHasPrivilegesResponse);

    const result = await checkIndicesPrivileges({ client, indices: ['index1'] });

    expect(result).toEqual({ index1: false });
  });
});
