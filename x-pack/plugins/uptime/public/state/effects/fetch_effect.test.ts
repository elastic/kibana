/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { call, put } from 'redux-saga/effects';
import { fetchEffectFactory } from './fetch_effect';
import { indexStatusAction } from '../actions';
import { HttpFetchError } from 'src/core/public';
import { StatesIndexStatus } from '../../../common/runtime_types';
import { fetchIndexStatus } from '../api';

describe('fetch saga effect factory', () => {
  const asyncAction = indexStatusAction;
  const calledAction = asyncAction.get();
  let fetchEffect;

  it('works with success workflow', () => {
    const indexStatusResult = {
      indexExists: true,
      docCount: 2712532,
      indices: 'heartbeat-*,synthetics-*',
    };
    const fetchStatus = async (): Promise<StatesIndexStatus> => {
      return { indexExists: true, docCount: 2712532, indices: 'heartbeat-*,synthetics-*' };
    };
    fetchEffect = fetchEffectFactory(
      fetchStatus,
      asyncAction.success,
      asyncAction.fail
    )(calledAction);
    let next = fetchEffect.next();

    // @ts-ignore TODO, dig deeper for TS issues here
    expect(next.value).toEqual(call(fetchStatus, calledAction.payload));

    const successResult = put(asyncAction.success(indexStatusResult));

    next = fetchEffect.next(indexStatusResult);

    expect(next.value).toEqual(successResult);
  });

  it('works with error workflow', () => {
    const indexStatusResultError = new HttpFetchError(
      'No heartbeat index found.',
      'error',
      {} as any
    );

    fetchEffect = fetchEffectFactory(
      fetchIndexStatus,
      asyncAction.success,
      asyncAction.fail
    )(calledAction);
    let next = fetchEffect.next();

    // @ts-ignore TODO, dig deeper for TS issues here
    expect(next.value).toEqual(call(fetchIndexStatus, calledAction.payload));

    const errorResult = put(asyncAction.fail(indexStatusResultError));

    next = fetchEffect.next(indexStatusResultError);

    expect(next.value).toEqual(errorResult);
  });

  it('works with throw error workflow', () => {
    const unExpectedError = new HttpFetchError(
      'No url found for the call, so throw error.',
      'error',
      {} as any
    );

    fetchEffect = fetchEffectFactory(
      fetchIndexStatus,
      asyncAction.success,
      asyncAction.fail
    )(calledAction);
    let next = fetchEffect.next();

    // @ts-ignore TODO, dig deeper for TS issues here
    expect(next.value).toEqual(call(fetchIndexStatus, calledAction.payload));

    const unexpectedErrorResult = put(asyncAction.fail(unExpectedError));

    next = fetchEffect.next(unExpectedError);

    expect(next.value).toEqual(unexpectedErrorResult);
  });
});
