/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { useCallback } from 'react';
import { ContentTabIds } from '../types';
import { useUrlState } from '../../../utils/use_url_state';
import { ASSET_DETAILS_URL_STATE_KEY } from '../constants';

export const DEFAULT_STATE: AssetDetailsUrlState = {
  tabId: ContentTabIds.OVERVIEW,
};

type SetAssetDetailsState = (newProp: Payload | null) => void;

export const useAssetDetailsUrlState = (): [AssetDetailsUrl, SetAssetDetailsState] => {
  const [urlState, setUrlState] = useUrlState<AssetDetailsUrl>({
    defaultState: null,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: ASSET_DETAILS_URL_STATE_KEY,
  });

  const setAssetDetailsState = useCallback(
    (newProps: Payload | null) => {
      if (!newProps) {
        setUrlState(null);
      } else {
        const payload = Object.fromEntries(
          Object.entries(newProps ?? {}).filter(([_, v]) => !!v || v === '')
        );
        setUrlState((previous) => ({ ...previous, ...payload }));
      }
    },
    [setUrlState]
  );

  return [urlState, setAssetDetailsState];
};

const TabIdRT = rt.union([
  rt.literal(ContentTabIds.OVERVIEW),
  rt.literal(ContentTabIds.METADATA),
  rt.literal(ContentTabIds.PROCESSES),
  rt.literal(ContentTabIds.LOGS),
  rt.literal(ContentTabIds.ANOMALIES),
  rt.literal(ContentTabIds.OSQUERY),
]);

const AssetDetailsUrlStateRT = rt.partial({
  autoRefresh: rt.partial({
    isPaused: rt.boolean,
    interval: rt.number,
  }),
  dateRange: rt.type({
    from: rt.string,
    to: rt.string,
  }),
  tabId: TabIdRT,
  name: rt.string,
  processSearch: rt.string,
  metadataSearch: rt.string,
  logsSearch: rt.string,
});

const AssetDetailsUrlRT = rt.union([AssetDetailsUrlStateRT, rt.null]);

export type AssetDetailsUrlState = rt.TypeOf<typeof AssetDetailsUrlStateRT>;
type AssetDetailsUrl = rt.TypeOf<typeof AssetDetailsUrlRT>;
type Payload = Partial<AssetDetailsUrlState>;

const encodeUrlState = AssetDetailsUrlRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(AssetDetailsUrlRT.decode(value), fold(constant(undefined), identity));
};
