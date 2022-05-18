/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import DateMath from '@kbn/datemath';
import { constant, identity } from 'fp-ts/lib/function';
import createContainer from 'constate';
import { useUrlState } from '../../../../utils/use_url_state';
import { useKibanaTimefilterTime } from '../../../../hooks/use_kibana_timefilter_time';
export const DEFAULT_WAFFLE_TIME_STATE: WaffleTimeState = {
  currentTime: Date.now(),
  isAutoReloading: false,
};

export const useWaffleTime = () => {
  // INFO: We currently only use the "to" time, but in the future we may do more.
  const [getTime] = useKibanaTimefilterTime({ from: 'now', to: 'now' });
  const kibanaTime = DateMath.parse(getTime().to);
  const [urlState, setUrlState] = useUrlState<WaffleTimeState>({
    defaultState: {
      ...DEFAULT_WAFFLE_TIME_STATE,
      currentTime: kibanaTime ? kibanaTime.toDate().getTime() : Date.now(),
    },
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleTime',
  });

  const [state, setState] = useState<WaffleTimeState>(urlState);

  useEffect(() => {
    setUrlState(state);
  }, [setUrlState, state]);

  const { currentTime, isAutoReloading } = urlState;

  const startAutoReload = useCallback(() => {
    setState((previous) => ({ ...previous, isAutoReloading: true }));
  }, [setState]);

  const stopAutoReload = useCallback(() => {
    setState((previous) => ({ ...previous, isAutoReloading: false }));
  }, [setState]);

  const jumpToTime = useCallback(
    (time: number) => {
      setState((previous) => ({ ...previous, currentTime: time }));
    },
    [setState]
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

export const WaffleTime = createContainer(useWaffleTime);
export const [WaffleTimeProvider, useWaffleTimeContext] = WaffleTime;
