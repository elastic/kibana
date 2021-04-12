/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { TransformId } from '../../../common/types/transform';

// Transform name must contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores;
// It must also start and end with an alphanumeric character.
export function isTransformIdValid(transformId: TransformId) {
  return /^[a-z0-9\-\_]+$/g.test(transformId) && !/^([_-].*)?(.*[_-])?$/g.test(transformId);
}

export enum REFRESH_TRANSFORM_LIST_STATE {
  ERROR = 'error',
  IDLE = 'idle',
  LOADING = 'loading',
  REFRESH = 'refresh',
}
export const refreshTransformList$ = new BehaviorSubject<REFRESH_TRANSFORM_LIST_STATE>(
  REFRESH_TRANSFORM_LIST_STATE.IDLE
);

export const useRefreshTransformList = (
  callback: {
    isLoading?(d: boolean): void;
    onRefresh?(): void;
  } = {}
) => {
  useEffect(() => {
    const distinct$ = refreshTransformList$.pipe(distinctUntilChanged());

    const subscriptions: Subscription[] = [];

    if (typeof callback.onRefresh === 'function') {
      // initial call to refresh
      callback.onRefresh();

      subscriptions.push(
        distinct$
          .pipe(filter((state) => state === REFRESH_TRANSFORM_LIST_STATE.REFRESH))
          .subscribe(() => typeof callback.onRefresh === 'function' && callback.onRefresh())
      );
    }

    if (typeof callback.isLoading === 'function') {
      subscriptions.push(
        distinct$.subscribe(
          (state) =>
            typeof callback.isLoading === 'function' &&
            callback.isLoading(state === REFRESH_TRANSFORM_LIST_STATE.LOADING)
        )
      );
    }

    return () => {
      subscriptions.map((sub) => sub.unsubscribe());
    };
    // The effect should only be called once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    refresh: () => {
      // A refresh is followed immediately by setting the state to loading
      // to trigger data fetching and loading indicators in one go.
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.LOADING);
    },
  };
};
