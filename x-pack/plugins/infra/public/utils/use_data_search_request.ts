/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';
import { BehaviorSubject, Observable, OperatorFunction, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from 'src/plugins/data/public';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

interface DataSearchRequest<
  RequestParams,
  RawResponse,
  Request extends IKibanaSearchRequest<RequestParams>
> {
  request: Request;
  options: ISearchOptions;
  response$: Observable<IKibanaSearchResponse<RawResponse>>;
  abortController: AbortController;
}

interface DataSearchResponse<
  RequestParams,
  Response,
  Request extends IKibanaSearchRequest<RequestParams>
> {
  request: Request;
  options: ISearchOptions;
  response: IKibanaSearchResponse<Response>;
  abortController: AbortController;
}

export const useDataSearch = <
  RequestFactoryArgs extends any[],
  RequestParams,
  RawResponse,
  Request extends IKibanaSearchRequest<RequestParams>
>({
  getRequest,
}: {
  getRequest: (...args: RequestFactoryArgs) => { request: Request; options: ISearchOptions } | null;
}) => {
  const { services } = useKibanaContextForPlugin();
  const [request$] = useState(() => new Subject<{ request: Request; options: ISearchOptions }>());
  const [requests$] = useState<Observable<DataSearchRequest<RequestParams, RawResponse, Request>>>(
    () =>
      request$.pipe(
        map(({ request, options }) => {
          const abortController = new AbortController();

          return {
            abortController,
            request,
            options,
            response$: services.data.search
              .search<Request, IKibanaSearchResponse<RawResponse>>(request, {
                abortSignal: abortController.signal,
                ...options,
              })
              .pipe(
                tapUnsubscribe(() => {
                  abortController.abort();
                })
              ),
          };
        })
      )
  );

  const search = useCallback(
    (...args: RequestFactoryArgs) => {
      const request = getRequest(...args);

      if (request) {
        request$.next(request);
      }
    },
    [getRequest, request$]
  );

  return {
    requests$,
    search,
  };
};

const tapUnsubscribe = (onUnsubscribe: () => void) => <T>(source$: Observable<T>) => {
  return new Observable<T>((subscriber) => {
    const subscription = source$.subscribe({
      next: (value) => subscriber.next(value),
      error: (error) => subscriber.error(error),
      complete: () => subscriber.complete(),
    });

    return () => {
      onUnsubscribe();
      subscription.unsubscribe();
    };
  });
};

export const useSubscription = <Value, InitialValue>(
  source$: Observable<Value>,
  initialValue: InitialValue | (() => InitialValue)
) => {
  const [latestValue, setLatestValue] = useState<Value | InitialValue>(initialValue);
  const [latestError, setLatestError] = useState<unknown>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  useEffect(() => {
    setIsComplete(false);

    const subscription = source$.subscribe({
      next: setLatestValue,
      error: setLatestError,
      complete: () => setIsComplete(true),
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [source$]);

  return { latestValue, latestError, isComplete };
};

export const useLatestDataSearchRequest = <
  RequestParams,
  RawResponse,
  ProcessedResponse,
  Request extends IKibanaSearchRequest<RequestParams>
>(
  requests$: Observable<DataSearchRequest<RequestParams, RawResponse, Request>>,
  operator: OperatorFunction<
    DataSearchRequest<RequestParams, RawResponse, Request>,
    DataSearchRequest<RequestParams, ProcessedResponse, Request>
  >
) => {
  // const [latestResponse$, setLatestResponse$] = useObservable((inputs$) => inputs$.pipe(), []);

  const [latestResponse$, setLatestResponse$] = useState<
    Observable<DataSearchResponse<RequestParams, ProcessedResponse, Request>>
  >(() =>
    requests$.pipe(
      operator,
      switchMap(({ abortController, options, request, response$ }) => {
        return response$.pipe(map((response) => ({ abortController, options, request, response })));
      })
    )
  );

  useEffect(() => {
    setLatestResponse$(
      requests$.pipe(
        operator,
        switchMap(({ abortController, options, request, response$ }) => {
          return response$.pipe(
            map((response) => ({ abortController, options, request, response }))
          );
        })
      )
    );
  }, [requests$, operator]);

  const { latestValue } = useSubscription(latestResponse$, null);

  const cancel = useCallback(() => {
    latestValue?.abortController.abort();
  }, [latestValue]);

  return {
    latestResponse: latestValue?.response.rawResponse,
    isRunning: latestValue?.response.isRunning ?? false,
    isPartial: latestValue?.response.isPartial ?? false,
    total: latestValue?.response.total ?? 0,
    loaded: latestValue?.response.loaded ?? 0,
    cancel,
  };
};

export const useObservable = <OutputValue, InputValues extends Readonly<any[]>>(
  createObservableOnce: (inputValues: Observable<InputValues>) => Observable<OutputValue>,
  inputValues: InputValues
) => {
  const [inputValues$] = useState(() => new BehaviorSubject<InputValues>(inputValues));
  const [output$] = useState(() => createObservableOnce(inputValues$));

  useEffect(() => {
    inputValues$.next(inputValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, inputValues);

  return output$;
};

export const mapRawResponse = <RequestParams, RawResponse, Response>(
  mapper: (rawResponse: RawResponse) => Response
) =>
  map<
    DataSearchRequest<RequestParams, RawResponse, IKibanaSearchRequest<RequestParams>>,
    DataSearchRequest<RequestParams, Response, IKibanaSearchRequest<RequestParams>>
  >((request) => ({
    ...request,
    response$: request.response$.pipe(
      map((response) => ({
        ...response,
        rawResponse: mapper(response.rawResponse),
      }))
    ),
  }));
