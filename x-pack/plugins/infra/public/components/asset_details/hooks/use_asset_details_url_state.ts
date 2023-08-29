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
import { FlyoutTabIds } from '../types';
import { useUrlState } from '../../../utils/use_url_state';

export const DEFAULT_STATE: AssetDetailsState = {
  tabId: FlyoutTabIds.OVERVIEW,
  processSearch: undefined,
  metadataSearch: undefined,
};
const ASSET_DETAILS_URL_STATE_KEY = 'asset_details';

type SetAssetDetailsState = (newProp: Payload | null) => void;

export const useAssetDetailsUrlState = (): [AssetDetailsUrl, SetAssetDetailsState] => {
  const [urlState, setUrlState] = useUrlState<AssetDetailsUrl>({
    defaultState: null,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: ASSET_DETAILS_URL_STATE_KEY,
  });

  const setAssetDetailsState = (newProps: Payload | null) => {
    if (!newProps) {
      setUrlState(DEFAULT_STATE);
    } else {
      const payload = Object.fromEntries(
        Object.entries(newProps).filter(([_, v]) => !!v || v === '')
      );
      setUrlState({ ...(urlState ?? DEFAULT_STATE), ...payload });
    }
  };

  return [urlState as AssetDetailsUrl, setAssetDetailsState];
};

const TabIdRT = rt.union([
  rt.literal(FlyoutTabIds.OVERVIEW),
  rt.literal(FlyoutTabIds.METADATA),
  rt.literal(FlyoutTabIds.PROCESSES),
  rt.literal(FlyoutTabIds.LOGS),
  rt.literal(FlyoutTabIds.ANOMALIES),
  rt.literal(FlyoutTabIds.OSQUERY),
]);

const AssetDetailsStateRT = rt.intersection([
  rt.type({
    tabId: TabIdRT,
  }),
  rt.partial({
    dateRange: rt.type({
      from: rt.string,
      to: rt.string,
    }),
    processSearch: rt.string,
    metadataSearch: rt.string,
    logsSearch: rt.string,
  }),
]);

const AssetDetailsUrlRT = rt.union([AssetDetailsStateRT, rt.null]);

export type AssetDetailsState = rt.TypeOf<typeof AssetDetailsStateRT>;
type AssetDetailsUrl = rt.TypeOf<typeof AssetDetailsUrlRT>;
type Payload = Partial<AssetDetailsState>;

const encodeUrlState = AssetDetailsUrlRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(AssetDetailsUrlRT.decode(value), fold(constant(undefined), identity));
};
