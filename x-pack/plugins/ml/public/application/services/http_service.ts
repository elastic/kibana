/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { HttpFetchOptionsWithPath, HttpFetchOptions, HttpStart } from '@kbn/core/public';
import { getHttp } from '../util/dependency_cache';

function getResultHeaders(headers: HeadersInit) {
  return {
    'Content-Type': 'application/json',
    ...headers,
  };
}

function getFetchOptions(options: HttpFetchOptionsWithPath): {
  path: string;
  fetchOptions: HttpFetchOptions;
} {
  const { path, method, headers, body, query, version } = options;
  if (!path) {
    throw new Error('URL path is missing');
  }

  const fetchOptions: HttpFetchOptions = {
    asSystemRequest: true,
    credentials: 'same-origin',
    method: method || 'GET',
    headers: getResultHeaders(headers ?? {}),
  };

  if (body) {
    fetchOptions.body = body;
  }
  if (query) {
    fetchOptions.query = query;
  }
  if (version) {
    fetchOptions.version = version;
  }

  return {
    path,
    fetchOptions,
  };
}

/**
 * Function for making HTTP requests to Kibana's backend.
 * Wrapper for Kibana's HttpHandler.
 *
 * @deprecated use {@link HttpService} instead
 */
export async function http<T>(options: HttpFetchOptionsWithPath): Promise<T> {
  const { path, fetchOptions } = getFetchOptions(options);
  return getHttp().fetch<T>(path, fetchOptions);
}

/**
 * ML Http Service
 */
export class HttpService {
  public getLoadingCount$: Observable<number>;

  constructor(private httpStart: HttpStart) {
    this.getLoadingCount$ = httpStart.getLoadingCount$();
  }

  /**
   * Creates an Observable from Kibana's HttpHandler.
   */
  private fromHttpHandler<T>(input: string, init?: RequestInit): Observable<T> {
    return new Observable<T>((subscriber) => {
      const controller = new AbortController();
      const signal = controller.signal;

      let abortable = true;
      let unsubscribed = false;

      if (init?.signal) {
        if (init.signal.aborted) {
          controller.abort();
        } else {
          init.signal.addEventListener('abort', () => {
            if (!signal.aborted) {
              controller.abort();
            }
          });
        }
      }

      const perSubscriberInit: RequestInit = {
        ...(init ? init : {}),
        signal,
      };

      this.httpStart
        .fetch<T>(input, perSubscriberInit)
        .then((response) => {
          abortable = false;
          subscriber.next(response);
          subscriber.complete();
        })
        .catch((err) => {
          abortable = false;
          if (!unsubscribed) {
            subscriber.error(err);
          }
        });

      return () => {
        unsubscribed = true;
        if (abortable) {
          controller.abort();
        }
      };
    });
  }

  /**
   * Function for making HTTP requests to Kibana's backend.
   * Wrapper for Kibana's HttpHandler.
   */
  public async http<T>(options: HttpFetchOptionsWithPath): Promise<T> {
    const { path, fetchOptions } = getFetchOptions(options);
    return this.httpStart.fetch<T>(path, fetchOptions);
  }

  /**
   * Function for making HTTP requests to Kibana's backend which returns an Observable
   * with request cancellation support.
   */
  public http$<T>(options: HttpFetchOptionsWithPath): Observable<T> {
    const { path, fetchOptions } = getFetchOptions(options);
    return this.fromHttpHandler<T>(path, fetchOptions);
  }
}
