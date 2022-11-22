/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INullableBaseStateContainer, syncState } from '@kbn/kibana-utils-plugin/public';
import { getOrElseW } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { useCallback, useState } from 'react';
import { map } from 'rxjs/operators';
import { minimalTimeKeyRT } from '../../../../common/time';
import { datemathStringRT } from '../../../utils/datemath';
import { useKbnUrlStateStorageFromRouterContext } from '../../../utils/kbn_url_state_context';

export const logPositionUrlStateRT = rt.partial({
  streamLive: rt.boolean,
  position: rt.union([rt.partial(minimalTimeKeyRT.props), rt.null]),
  start: datemathStringRT,
  end: datemathStringRT,
});

export type LogPositionUrlState = rt.TypeOf<typeof logPositionUrlStateRT>;

export const LOG_POSITION_URL_STATE_KEY = 'logPosition';

export const useLogPositionUrlStateSync = () => {
  const urlStateStorage = useKbnUrlStateStorageFromRouterContext();

  const [initialStateFromUrl] = useState(() =>
    pipe(
      logPositionUrlStateRT.decode(urlStateStorage.get(LOG_POSITION_URL_STATE_KEY)),
      getOrElseW(() => null)
    )
  );

  const startSyncingWithUrl = useCallback(
    (stateContainer: INullableBaseStateContainer<LogPositionUrlState>) => {
      if (initialStateFromUrl == null) {
        urlStateStorage.set(LOG_POSITION_URL_STATE_KEY, stateContainer.get(), {
          replace: true,
        });
      }

      const { start, stop } = syncState({
        storageKey: LOG_POSITION_URL_STATE_KEY,
        stateContainer: {
          state$: stateContainer.state$.pipe(map(logPositionUrlStateRT.encode)),
          set: (value) =>
            stateContainer.set(
              pipe(
                logPositionUrlStateRT.decode(value),
                getOrElseW(() => null)
              )
            ),
          get: () => logPositionUrlStateRT.encode(stateContainer.get()),
        },
        stateStorage: {
          ...urlStateStorage,
          set: <State>(key: string, state: State) =>
            urlStateStorage.set(key, state, { replace: true }),
        },
      });

      start();

      return stop;
    },
    [initialStateFromUrl, urlStateStorage]
  );

  return {
    initialStateFromUrl,
    startSyncingWithUrl,
  };
};
