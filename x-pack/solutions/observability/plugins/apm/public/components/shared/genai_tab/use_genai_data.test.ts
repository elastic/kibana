/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useGenAiData } from './use_genai_data';

jest.mock('../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));

const mockUseFetcher = useFetcher as jest.MockedFunction<typeof useFetcher>;

const genAiMetadata = { 'gen_ai.operation.name': 'chat', 'gen_ai.system': 'openai' };

const setFetch = (
  data: { id: string; metadata: Record<string, unknown> } | undefined,
  status = FETCH_STATUS.SUCCESS
) =>
  mockUseFetcher.mockReturnValue({
    data,
    status,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useFetcher>);

const renderGenAiData = (id: string | undefined) =>
  renderHook(() =>
    useGenAiData({
      processorEvent: ProcessorEvent.span,
      id,
      timestamp: id ? '2024-01-01T00:00:00.000Z' : undefined,
    })
  ).result.current;

describe('useGenAiData', () => {
  it('returns the metadata fetched for the current event', () => {
    setFetch({ id: 'span-1', metadata: genAiMetadata });

    const { metadata, isMetadataLoading, isGenAiSpan } = renderGenAiData('span-1');

    expect(metadata).toEqual(genAiMetadata);
    expect(isMetadataLoading).toBe(false);
    expect(isGenAiSpan).toBe(true);
  });

  it.each([
    ['another event is requested', 'span-2'],
    ['the event is cleared', undefined],
  ])('treats the previous event metadata as loading when %s', (_, id) => {
    setFetch({ id: 'span-1', metadata: genAiMetadata });

    const { metadata, isMetadataLoading, isGenAiSpan, genAi } = renderGenAiData(id);

    expect(metadata).toEqual({});
    expect(isMetadataLoading).toBe(true);
    expect(isGenAiSpan).toBe(false);
    expect(genAi).toBeUndefined();
  });

  it('stops loading with empty metadata when the request fails', () => {
    setFetch(undefined, FETCH_STATUS.FAILURE);

    const { metadata, isMetadataLoading, isGenAiSpan } = renderGenAiData('span-1');

    expect(metadata).toEqual({});
    expect(isMetadataLoading).toBe(false);
    expect(isGenAiSpan).toBe(false);
  });
});
