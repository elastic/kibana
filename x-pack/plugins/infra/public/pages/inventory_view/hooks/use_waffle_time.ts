/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useCallback } from 'react';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { useUrlState } from '../../../utils/use_url_state';

export const DEFAULT_WAFFLE_TIME_STATE: WaffleTimeState = {
  currentTime: Date.now(),
  isAutoReloading: false,
};

export const useWaffleTime = () => {
  const [state, setState] = useUrlState<WaffleTimeState>({
    defaultState: DEFAULT_WAFFLE_TIME_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleTime',
  });

  const { currentTime, isAutoReloading } = state;

  const startAutoReload = useCallback(() => {
    setState({ ...state, isAutoReloading: true });
  }, [state, setState]);

  const stopAutoReload = useCallback(() => {
    setState({ ...state, isAutoReloading: false });
  }, [state, setState]);

  const jumpToTime = useCallback(
    (time: number) => {
      setState({ ...state, currentTime: time });
    },
    [state, setState]
  );

  const currentTimeRange = {
    from: currentTime - 1000 * 60 * 5,
    interval: '1m',
    to: currentTime,
  };

  return {
    currentTime,
    currentTimeRange,
    isAutoReloading,
    startAutoReload,
    stopAutoReload,
    jumpToTime,
    setWaffleTimeState: setState,
  };
};

export const WaffleTimeStateRT = rt.type({
  currentTime: rt.number,
  isAutoReloading: rt.boolean,
});

export type WaffleTimeState = rt.TypeOf<typeof WaffleTimeStateRT>;
const encodeUrlState = WaffleTimeStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(WaffleTimeStateRT.decode(value), fold(constant(undefined), identity));
