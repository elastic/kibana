/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ISearchOptions,
  ISearchSource,
  ISearchStartSearchSource,
  SearchSource,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/common';
import { catchError, throwError } from 'rxjs';

interface Props {
  abortController: AbortController;
  searchSourceClient: ISearchStartSearchSource;
}

interface WrapParams<T extends ISearchSource | SearchSource> {
  abortController: AbortController;
  pureSearchSource: T;
}

export function wrapSearchSourceClient({
  abortController,
  searchSourceClient: pureSearchSourceClient,
}: Props) {
  const wrappedSearchSourceClient: ISearchStartSearchSource = Object.create(pureSearchSourceClient);

  wrappedSearchSourceClient.createEmpty = () => {
    const pureSearchSource = pureSearchSourceClient.createEmpty();

    return wrapSearchSource({
      abortController,
      pureSearchSource,
    });
  };

  wrappedSearchSourceClient.create = async (fields?: SerializedSearchSourceFields) => {
    const pureSearchSource = await pureSearchSourceClient.create(fields);

    return wrapSearchSource({
      abortController,
      pureSearchSource,
    });
  };

  return wrappedSearchSourceClient;
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

function wrapFetch$({ abortController, pureSearchSource }: WrapParams<ISearchSource>) {
  return (options?: ISearchOptions) => {
    const searchOptions = options ?? {};
    return pureSearchSource
      .fetch$({
        ...searchOptions,
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
        })
      );
  };
}
