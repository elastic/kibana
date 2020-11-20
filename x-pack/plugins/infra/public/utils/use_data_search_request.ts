/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { of, Observable, OperatorFunction, PartialObserver, Subject } from 'rxjs';
import { concatMap, map, switchMap } from 'rxjs/operators';
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

export const useDataSearch = <
  RequestFactoryArgs extends any[],
  RequestParams,
  RawResponse,
  Request extends IKibanaSearchRequest<RequestParams>
>({
  getRequest,
}: // responseOperator,
{
  getRequest: (...args: RequestFactoryArgs) => { request: Request; options: ISearchOptions } | null;
  // getRequestOptions: (...args: any[]) => ISearchOptions;
  // responseOperator?: OperatorFunction<IKibanaSearchResponse<RawResult>, IKibanaSearchResponse<Result>>;
  // subscriber: PartialObserver<RawResult>;
}) => {
  const { services } = useKibanaContextForPlugin();
  const latestAbortController = useRef<AbortController | undefined>();
  const [request$] = useState(() => new Subject<{ request: Request; options: ISearchOptions }>());
  // const [latestResult, setLatestResult] = useState<RawResult>()
  const [requests$] = useState<Observable<DataSearchRequest<RequestParams, RawResponse, Request>>>(
    () =>
      request$.pipe(
        map(({ request, options }) => {
          const abortController = new AbortController();
          latestAbortController.current = abortController;

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

  // const [latestValue, latestError, isComplete] = useSubscription(response$, null);

  const search = useCallback(
    (...args: RequestFactoryArgs) => {
      const request = getRequest(...args);

      if (request) {
        request$.next(request);
      }
    },
    [getRequest, request$]
  );

  const cancel = useCallback(() => {
    latestAbortController.current?.abort();
  }, [latestAbortController]);

  return {
    requests$,
    search,
    cancel,
  };
};

// export const useDataSearchResponse = <RawResponse, Response, InitialResponse = Response>(
//   response$: Observable<IKibanaSearchResponse<RawResponse>>,
//   operator: OperatorFunction<RawResponse, Response>,
//   initialValue: InitialResponse
// ) => {
//   const { latestValue, latestError, isComplete } = useSubscription(response$, {
//     rawResponse: initialValue,
//   } as IKibanaSearchResponse<InitialResponse>);
// };

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
  initialValue: InitialValue
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
  Request extends IKibanaSearchRequest<RequestParams>
>(
  requests$: Observable<DataSearchRequest<RequestParams, RawResponse, Request>>,
  operator: OperatorFunction<DataSearchRequest<RequestParams, RawResponse, Request>, Foo>
) => {
  const [latestResponse$] = useState(() => {
    return requests$.pipe(
      switchMap((request) => {
        return request.response$;
      })
    );
  });
};

export const usePipe = <SourceValue, SinkValue>(
  source$: Observable<SourceValue>,
  operator: OperatorFunction<SourceValue, SinkValue>
): Observable<SinkValue> => {
  const latestOperator = useLatest(operator);

  const [sink$] = useState(() =>
    source$.pipe(concatMap((value) => of(value).pipe(latestOperator.current)))
  );

  return sink$;
};

const useLatest = <T>(value: T): { readonly current: T } => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

const identity = <Value>(value: Value) => value;
