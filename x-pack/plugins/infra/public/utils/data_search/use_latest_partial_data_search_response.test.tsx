/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { Observable, of, Subject } from 'rxjs';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../src/plugins/data/public';
import { DataSearchRequestDescriptor } from './types';
import { useLatestPartialDataSearchResponse } from './use_latest_partial_data_search_response';

describe('useLatestPartialDataSearchResponse hook', () => {
  it("subscribes to the latest request's response observable", () => {
    const firstRequest = {
      abortController: new AbortController(),
      options: {},
      request: { params: 'firstRequestParam' },
      response$: new Subject<IKibanaSearchResponse<string>>(),
    };

    const secondRequest = {
      abortController: new AbortController(),
      options: {},
      request: { params: 'secondRequestParam' },
      response$: new Subject<IKibanaSearchResponse<string>>(),
    };

    const requests$ = new Subject<
      DataSearchRequestDescriptor<IKibanaSearchRequest<string>, string>
    >();

    const { result } = renderHook(() =>
      useLatestPartialDataSearchResponse(requests$, 'initial', (response) => ({
        data: `projection of ${response}`,
      }))
    );

    expect(result).toHaveProperty('current.isRequestRunning', false);
    expect(result).toHaveProperty('current.latestResponseData', undefined);

    // first request is started
    act(() => {
      requests$.next(firstRequest);
    });

    expect(result).toHaveProperty('current.isRequestRunning', true);
    expect(result).toHaveProperty('current.latestResponseData', 'initial');

    // first response of the first request arrives
    act(() => {
      firstRequest.response$.next({ rawResponse: 'request-1-response-1', isRunning: true });
    });

    expect(result).toHaveProperty('current.isRequestRunning', true);
    expect(result).toHaveProperty(
      'current.latestResponseData',
      'projection of request-1-response-1'
    );

    // second request is started before the second response of the first request arrives
    act(() => {
      requests$.next(secondRequest);
      secondRequest.response$.next({ rawResponse: 'request-2-response-1', isRunning: true });
    });

    expect(result).toHaveProperty('current.isRequestRunning', true);
    expect(result).toHaveProperty(
      'current.latestResponseData',
      'projection of request-2-response-1'
    );

    // second response of the second request arrives
    act(() => {
      secondRequest.response$.next({ rawResponse: 'request-2-response-2', isRunning: false });
    });

    expect(result).toHaveProperty('current.isRequestRunning', false);
    expect(result).toHaveProperty(
      'current.latestResponseData',
      'projection of request-2-response-2'
    );
  });

  it("unsubscribes from the latest request's response observable on unmount", () => {
    const onUnsubscribe = jest.fn();

    const firstRequest = {
      abortController: new AbortController(),
      options: {},
      request: { params: 'firstRequestParam' },
      response$: new Observable<IKibanaSearchResponse<string>>(() => {
        return onUnsubscribe;
      }),
    };

    const requests$ = of<DataSearchRequestDescriptor<IKibanaSearchRequest<string>, string>>(
      firstRequest
    );

    const { unmount } = renderHook(() =>
      useLatestPartialDataSearchResponse(requests$, 'initial', (response) => ({
        data: `projection of ${response}`,
      }))
    );

    expect(onUnsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(onUnsubscribe).toHaveBeenCalled();
  });
});
