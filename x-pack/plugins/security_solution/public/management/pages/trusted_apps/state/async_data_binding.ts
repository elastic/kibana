/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable } from '../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../common/types';

export interface UninitialisedAsyncBinding {
  type: 'UninitialisedAsyncBinding';
}

export interface InProgressAsyncBinding<T, E = ServerApiError> {
  type: 'InProgressAsyncBinding';
  previousBinding: StaleAsyncBinding<T, E>;
}

export interface PresentAsyncBinding<T> {
  type: 'PresentAsyncBinding';
  data: T;
}

export interface FailedAsyncBinding<T, E = ServerApiError> {
  type: 'FailedAsyncBinding';
  error: E;
  lastPresentBinding?: PresentAsyncBinding<T>;
}

export type StaleAsyncBinding<T, E = ServerApiError> =
  | UninitialisedAsyncBinding
  | PresentAsyncBinding<T>
  | FailedAsyncBinding<T, E>;

export type AsyncDataBinding<T, E = ServerApiError> =
  | UninitialisedAsyncBinding
  | InProgressAsyncBinding<T, E>
  | PresentAsyncBinding<T>
  | FailedAsyncBinding<T, E>;

export const isUninitialisedAsyncBinding = <T, E>(
  binding: Immutable<AsyncDataBinding<T, E>>
): binding is Immutable<UninitialisedAsyncBinding> => binding.type === 'UninitialisedAsyncBinding';

export const isInProgressBinding = <T, E>(
  binding: Immutable<AsyncDataBinding<T, E>>
): binding is Immutable<InProgressAsyncBinding<T, E>> => binding.type === 'InProgressAsyncBinding';

export const isPresentAsyncBinding = <T, E>(
  binding: Immutable<AsyncDataBinding<T, E>>
): binding is Immutable<PresentAsyncBinding<T>> => binding.type === 'PresentAsyncBinding';

export const isFailedAsyncBinding = <T, E>(
  binding: Immutable<AsyncDataBinding<T, E>>
): binding is Immutable<FailedAsyncBinding<T, E>> => binding.type === 'FailedAsyncBinding';

export const getLastPresentDataBinding = <T, E>(
  binding: Immutable<AsyncDataBinding<T, E>>
): Immutable<PresentAsyncBinding<T>> | undefined => {
  if (isPresentAsyncBinding(binding)) {
    return binding;
  } else if (isInProgressBinding(binding)) {
    return getLastPresentDataBinding(binding.previousBinding);
  } else if (isFailedAsyncBinding(binding)) {
    return binding.lastPresentBinding;
  } else {
    return undefined;
  }
};

export const getLastPresentData = <T, E>(
  binding: Immutable<AsyncDataBinding<T, E>>
): Immutable<T> | undefined => {
  return getLastPresentDataBinding(binding)?.data;
};

export const getCurrentError = <T, E>(
  binding: Immutable<AsyncDataBinding<T, E>>
): Immutable<E> | undefined => {
  return isFailedAsyncBinding(binding) ? binding.error : undefined;
};

export const isOutdatedBinding = <T, E>(
  binding: AsyncDataBinding<T, E>,
  isFresh: (data: T) => boolean
): boolean =>
  isUninitialisedAsyncBinding(binding) ||
  (isPresentAsyncBinding(binding) && !isFresh(binding.data)) ||
  (isFailedAsyncBinding(binding) &&
    (!binding.lastPresentBinding || !isFresh(binding.lastPresentBinding.data)));
