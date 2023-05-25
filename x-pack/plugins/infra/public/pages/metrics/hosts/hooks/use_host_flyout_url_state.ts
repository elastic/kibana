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

export const DEFAULT_STATE = {
  clickedItemId: '',
  selectedTabId: FlyoutTabIds.METADATA,
  processSearch: '',
  metadataSearch: '',
};
const HOST_FLYOUT_URL_STATE_KEY = 'hostFlyoutOpen';

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
      const payload = Object.fromEntries(Object.entries(newProps ?? {}).filter(([_, v]) => !!v));
      setUrlState({ ...(urlState ?? DEFAULT_STATE), ...payload });
    }
  };

  return [urlState as HostFlyoutUrl, setHostFlyoutState];
};

const FlyoutTabIdRT = rt.union([
  rt.literal(FlyoutTabIds.METADATA),
  rt.literal(FlyoutTabIds.PROCESSES),
]);

const HostFlyoutStateRT = rt.type({
  clickedItemId: rt.string,
  selectedTabId: FlyoutTabIdRT,
  processSearch: rt.string,
  metadataSearch: rt.string,
});

const HostFlyoutUrlRT = rt.union([HostFlyoutStateRT, rt.null]);

type HostFlyoutState = rt.TypeOf<typeof HostFlyoutStateRT>;
type HostFlyoutUrl = rt.TypeOf<typeof HostFlyoutUrlRT>;
type Payload = Partial<HostFlyoutState>;
export type HostFlyout = rt.TypeOf<typeof HostFlyoutStateRT>;

const encodeUrlState = HostFlyoutUrlRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(HostFlyoutUrlRT.decode(value), fold(constant(undefined), identity));
};
