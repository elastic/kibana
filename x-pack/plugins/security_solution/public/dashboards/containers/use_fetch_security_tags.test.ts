/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { act, renderHook } from '@testing-library/react-hooks';
import {
  INTERNAL_TAGS_URL,
  SECURITY_TAG_DESCRIPTION,
  SECURITY_TAG_NAME,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useFetchSecurityTags } from './use_fetch_security_tags';

jest.mock('../../common/lib/kibana');

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockAbortSignal = {} as unknown as AbortSignal;

const renderUseCreateSecurityDashboardLink = () => renderHook(() => useFetchSecurityTags(), {});

const asyncRenderUseCreateSecurityDashboardLink = async () => {
  const renderedHook = renderUseCreateSecurityDashboardLink();
  await act(async () => {
    await renderedHook.waitForNextUpdate();
  });
  return renderedHook;
};

describe('useFetchSecurityTags', () => {
  beforeAll(() => {
    useKibana().services.http = { get: mockGet, put: mockPut } as unknown as HttpStart;

    global.AbortController = jest.fn().mockReturnValue({
      abort: jest.fn(),
      signal: mockAbortSignal,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch Security Solution tags', async () => {
    mockGet.mockResolvedValue([]);
    await asyncRenderUseCreateSecurityDashboardLink();

    expect(mockGet).toHaveBeenCalledWith(INTERNAL_TAGS_URL, {
      query: { name: SECURITY_TAG_NAME },
      signal: mockAbortSignal,
    });
  });

  test('should create a Security Solution tag if no Security Solution tags were found', async () => {
    mockGet.mockResolvedValue([]);
    await asyncRenderUseCreateSecurityDashboardLink();

    expect(mockPut).toHaveBeenCalledWith(INTERNAL_TAGS_URL, {
      body: JSON.stringify({ name: SECURITY_TAG_NAME, description: SECURITY_TAG_DESCRIPTION }),
      signal: mockAbortSignal,
    });
  });

  test('should return Security Solution tags', async () => {
    const mockFoundTags = [{ id: 'tagId', name: 'Security Solution', description: '', color: '' }];
    mockGet.mockResolvedValue(mockFoundTags);
    const { result } = await asyncRenderUseCreateSecurityDashboardLink();

    expect(mockPut).not.toHaveBeenCalled();
    expect(result.current.tags).toEqual(expect.objectContaining(mockFoundTags));
  });
});
