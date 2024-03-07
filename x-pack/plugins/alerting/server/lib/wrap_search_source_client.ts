/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import {
  ISearchOptions,
  ISearchSource,
  ISearchStartSearchSource,
  SearchSource,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/common';
import { catchError, tap, throwError } from 'rxjs';
import { LogSearchMetricsOpts, RuleInfo, SearchMetrics } from './types';

interface Props {
  logger: Logger;
  rule: RuleInfo;
  abortController: AbortController;
  searchSourceClient: ISearchStartSearchSource;
  requestTimeout?: number;
}

interface WrapParams<T extends ISearchSource | SearchSource> {
  logger: Logger;
  rule: RuleInfo;
  abortController: AbortController;
  pureSearchSource: T;
  logMetrics: (metrics: LogSearchMetricsOpts) => void;
  requestTimeout?: number;
}

export interface WrappedSearchSourceClient {
  searchSourceClient: ISearchStartSearchSource;
  getMetrics: () => SearchMetrics;
}

export function wrapSearchSourceClient({
  logger,
  rule,
  abortController,
  searchSourceClient: pureSearchSourceClient,
  requestTimeout,
}: Props): WrappedSearchSourceClient {
  let numSearches: number = 0;
  let esSearchDurationMs: number = 0;
  let totalSearchDurationMs: number = 0;

  function logMetrics(metrics: LogSearchMetricsOpts) {
    numSearches++;
    esSearchDurationMs += metrics.esSearchDuration;
    totalSearchDurationMs += metrics.totalSearchDuration;
  }

  const wrapParams = {
    logMetrics,
    logger,
    rule,
    abortController,
    requestTimeout,
  };

  const wrappedSearchSourceClient: ISearchStartSearchSource = Object.create(pureSearchSourceClient);

  wrappedSearchSourceClient.createEmpty = () => {
    const pureSearchSource = pureSearchSourceClient.createEmpty();

    return wrapSearchSource({
      ...wrapParams,
      pureSearchSource,
    });
  };

  wrappedSearchSourceClient.create = async (fields?: SerializedSearchSourceFields) => {
    const pureSearchSource = await pureSearchSourceClient.create(fields);

    return wrapSearchSource({
      ...wrapParams,
      pureSearchSource,
    });
  };

  return {
    searchSourceClient: wrappedSearchSourceClient,
    getMetrics: (): SearchMetrics => ({
      esSearchDurationMs,
      totalSearchDurationMs,
      numSearches,
    }),
  };
}

function wrapSearchSource<T extends ISearchSource | SearchSource>({
  pureSearchSource,
  ...wrapParams
}: WrapParams<T>): T {
  const wrappedSearchSource = Object.create(pureSearchSource);

  wrappedSearchSource.createChild = wrapCreateChild({ ...wrapParams, pureSearchSource });
  wrappedSearchSource.createCopy = wrapCreateCopy({ ...wrapParams, pureSearchSource });
  wrappedSearchSource.create = wrapCreate({ ...wrapParams, pureSearchSource });
  wrappedSearchSource.fetch$ = wrapFetch$({ ...wrapParams, pureSearchSource });

  return wrappedSearchSource;
}

function wrapCreate({ pureSearchSource, ...wrapParams }: WrapParams<ISearchSource>) {
  return function () {
    const pureCreatedSearchSource = pureSearchSource.create();

    return wrapSearchSource({
      ...wrapParams,
      pureSearchSource: pureCreatedSearchSource,
    });
  };
}

function wrapCreateChild({ pureSearchSource, ...wrapParams }: WrapParams<ISearchSource>) {
  return function (options?: {}) {
    const pureSearchSourceChild = pureSearchSource.createChild(options);

    return wrapSearchSource({
      ...wrapParams,
      pureSearchSource: pureSearchSourceChild,
    });
  };
}

function wrapCreateCopy({ pureSearchSource, ...wrapParams }: WrapParams<ISearchSource>) {
  return function () {
    const pureSearchSourceChild = pureSearchSource.createCopy();

    return wrapSearchSource({
      ...wrapParams,
      pureSearchSource: pureSearchSourceChild,
    }) as SearchSource;
  };
}

function wrapFetch$({
  logger,
  rule,
  abortController,
  pureSearchSource,
  logMetrics,
  requestTimeout,
}: WrapParams<ISearchSource>) {
  return (options?: ISearchOptions) => {
    const searchOptions = options ?? {};
    const start = Date.now();

    logger.debug(
      `executing query for rule ${rule.alertTypeId}:${rule.id} in space ${
        rule.spaceId
      } - with options ${JSON.stringify(searchOptions)}${
        requestTimeout ? ` and ${requestTimeout}ms requestTimeout` : ''
      }`
    );

    return pureSearchSource
      .fetch$({
        ...searchOptions,
        ...(requestTimeout
          ? {
              transport: { requestTimeout },
            }
          : {}),
        abortSignal: abortController.signal,
      })
      .pipe(
        catchError((error) => {
          if (abortController.signal.aborted) {
            return throwError(
              () => new Error('Search has been aborted due to cancelled execution')
            );
          }
          return throwError(() => error);
        }),
        tap((result) => {
          const durationMs = Date.now() - start;
          logMetrics({
            esSearchDuration: result.rawResponse.took ?? 0,
            totalSearchDuration: durationMs,
          });
        })
      );
  };
}
