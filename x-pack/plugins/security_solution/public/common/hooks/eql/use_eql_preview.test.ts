/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Unit } from '@elastic/datemath';
import { renderHook, act } from '@testing-library/react-hooks';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import * as i18n from '../translations';
import { EqlSearchStrategyResponse } from '../../../../../data_enhanced/common';
import { Source } from './types';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';
import { useKibana } from '../../../common/lib/kibana';
import { useEqlPreview } from '.';
import { getMockEqlResponse } from './eql_search_response.mock';

jest.mock('../../../common/lib/kibana');

describe('useEqlPreview', () => {
  const params = {
    to: '2020-10-04T16:00:54.368707900Z',
    query: 'file where true',
    index: ['foo-*', 'bar-*'],
    interval: 'h' as Unit,
    from: '2020-10-04T15:00:54.368707900Z',
  };

  beforeEach(() => {
    useKibana().services.notifications.toasts.addError = jest.fn();

    useKibana().services.notifications.toasts.addWarning = jest.fn();

    (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
      of(getMockEqlResponse())
    );
  });

  it('should initiate hook', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useEqlPreview());
      await waitForNextUpdate();

      expect(result.current[0]).toBeFalsy();
      expect(typeof result.current[1]).toEqual('function');
      expect(result.current[2]).toEqual({
        data: [],
        inspect: { dsl: [], response: [] },
        refetch: result.current[2].refetch,
        totalCount: 0,
      });
    });
  });

  it('should invoke search with passed in params', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useEqlPreview());

      await waitForNextUpdate();

      result.current[1](params);

      const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

      expect(mockCalls.length).toEqual(1);
      expect(mockCalls[0][0].params.body.query).toEqual('file where true');
      expect(mockCalls[0][0].params.body.filter).toEqual({
        range: {
          '@timestamp': {
            format: 'strict_date_optional_time',
            gte: '2020-10-04T15:00:54.368707900Z',
            lte: '2020-10-04T16:00:54.368707900Z',
          },
        },
      });
      expect(mockCalls[0][0].params.index).toBe('foo-*,bar-*');
    });
  });

  it('should resolve values after search is invoked', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useEqlPreview());

      await waitForNextUpdate();

      result.current[1](params);

      expect(result.current[0]).toBeFalsy();
      expect(typeof result.current[1]).toEqual('function');
      expect(result.current[2].totalCount).toEqual(4);
      expect(result.current[2].data.length).toBeGreaterThan(0);
      expect(result.current[2].inspect.dsl.length).toBeGreaterThan(0);
      expect(result.current[2].inspect.response.length).toBeGreaterThan(0);
    });
  });

  it('should not resolve values after search is invoked if component unmounted', async () => {
    await act(async () => {
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        of(getMockEqlResponse()).pipe(delay(5000))
      );
      const { result, waitForNextUpdate, unmount } = renderHook(() => useEqlPreview());

      await waitForNextUpdate();

      result.current[1](params);

      unmount();

      expect(result.current[0]).toBeTruthy();
      expect(result.current[2].totalCount).toEqual(0);
      expect(result.current[2].data.length).toEqual(0);
      expect(result.current[2].inspect.dsl.length).toEqual(0);
      expect(result.current[2].inspect.response.length).toEqual(0);
    });
  });

  it('should not resolve new values on search if response is error response', async () => {
    await act(async () => {
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        of<EqlSearchStrategyResponse<EqlSearchResponse<Source>>>({
          ...getMockEqlResponse(),
          isRunning: false,
          isPartial: true,
        })
      );

      const { result, waitForNextUpdate } = renderHook(() => useEqlPreview());

      await waitForNextUpdate();

      result.current[1](params);

      const mockCalls = (useKibana().services.notifications.toasts.addWarning as jest.Mock).mock
        .calls;

      expect(result.current[0]).toBeFalsy();
      expect(mockCalls[0][0]).toEqual(i18n.EQL_PREVIEW_FETCH_FAILURE);
    });
  });

  // TODO: Determine why eql search strategy returns null for meta.params.body
  // in complete responses, but not in partial responses
  it('should update inspect information on partial response', async () => {
    const mockResponse = getMockEqlResponse();
    await act(async () => {
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        of<EqlSearchStrategyResponse<EqlSearchResponse<Source>>>({
          isRunning: true,
          isPartial: true,
          rawResponse: mockResponse.rawResponse,
        })
      );

      const { result, waitForNextUpdate } = renderHook(() => useEqlPreview());

      await waitForNextUpdate();

      result.current[1](params);

      expect(result.current[2].inspect.dsl.length).toEqual(1);
      expect(result.current[2].inspect.response.length).toEqual(1);
    });
  });

  it('should add danger toast if search throws', async () => {
    await act(async () => {
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        throwError('This is an error!')
      );

      const { result, waitForNextUpdate } = renderHook(() => useEqlPreview());

      await waitForNextUpdate();

      result.current[1](params);

      const mockCalls = (useKibana().services.notifications.toasts.addError as jest.Mock).mock
        .calls;

      expect(result.current[0]).toBeFalsy();
      expect(mockCalls[0][0]).toEqual('This is an error!');
    });
  });

  it('returns a memoized value', async () => {
    const { result, rerender } = renderHook(() => useEqlPreview());

    const result1 = result.current[1];
    act(() => rerender());
    const result2 = result.current[1];

    expect(result1).toBe(result2);
  });
});
