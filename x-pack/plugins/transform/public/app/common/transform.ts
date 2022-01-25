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
import { cloneDeep } from 'lodash';
import type { TransformConfigUnion, TransformId } from '../../../common/types/transform';

// Via https://github.com/elastic/elasticsearch/blob/master/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/transform/utils/TransformStrings.java#L24
// Matches a string that contains lowercase characters, digits, hyphens, underscores or dots.
// The string may start and end only in characters or digits.
// Note that '.' is allowed but not documented.
export function isTransformIdValid(transformId: TransformId) {
  return /^[a-z0-9](?:[a-z0-9_\-\.]*[a-z0-9])?$/g.test(transformId);
}

export const TRANSFORM_ERROR_TYPE = {
  DANGLING_TASK: 'dangling_task',
} as const;
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

export const overrideTransformForCloning = (originalConfig: TransformConfigUnion) => {
  // 'Managed' means job is preconfigured and deployed by other solutions
  // we should not clone this setting
  const clonedConfig = cloneDeep(originalConfig);
  delete clonedConfig._meta?.managed;
  return clonedConfig;
};
