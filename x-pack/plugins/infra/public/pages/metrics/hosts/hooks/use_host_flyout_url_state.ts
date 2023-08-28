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
import { FlyoutTabIds } from '../../../../components/asset_details/types';
import { useUrlState } from '../../../../utils/use_url_state';

export const DEFAULT_STATE: HostFlyout = {
  itemId: '',
  tabId: FlyoutTabIds.OVERVIEW,
  processSearch: undefined,
  metadataSearch: undefined,
};
const HOST_FLYOUT_URL_STATE_KEY = 'flyout';

type SetHostFlyoutState = (newProp: Payload | null) => void;

export const useHostFlyoutUrlState = (): [HostFlyoutUrl, SetHostFlyoutState] => {
  const [urlState, setUrlState] = useUrlState<HostFlyoutUrl>({
    defaultState: null,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_FLYOUT_URL_STATE_KEY,
  });

  const setHostFlyoutState = (newProps: Payload | null) => {
    if (!newProps) {
      setUrlState(DEFAULT_STATE);
    } else {
      const payload = Object.fromEntries(
        Object.entries(newProps).filter(([_, v]) => !!v || v === '')
      );
      setUrlState({ ...(urlState ?? DEFAULT_STATE), ...payload });
    }
  };

  return [urlState as HostFlyoutUrl, setHostFlyoutState];
};

const FlyoutTabIdRT = rt.union([
  rt.literal(FlyoutTabIds.OVERVIEW),
  rt.literal(FlyoutTabIds.METADATA),
  rt.literal(FlyoutTabIds.PROCESSES),
  rt.literal(FlyoutTabIds.LOGS),
  rt.literal(FlyoutTabIds.ANOMALIES),
  rt.literal(FlyoutTabIds.OSQUERY),
]);

const HostFlyoutStateRT = rt.intersection([
  rt.type({
    itemId: rt.string,
    tabId: FlyoutTabIdRT,
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

const HostFlyoutUrlRT = rt.union([HostFlyoutStateRT, rt.null]);

type HostFlyoutState = rt.TypeOf<typeof HostFlyoutStateRT>;
type HostFlyoutUrl = rt.TypeOf<typeof HostFlyoutUrlRT>;
type Payload = Partial<HostFlyoutState>;
export type HostFlyout = rt.TypeOf<typeof HostFlyoutStateRT>;

const encodeUrlState = HostFlyoutUrlRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(HostFlyoutUrlRT.decode(value), fold(constant(undefined), identity));
};
