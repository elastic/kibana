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
import { useUrlState } from '../../../../utils/use_url_state';

export enum FlyoutTabIds {
  METADATA = 'metadata',
  PROCESSES = 'processes',
}

export const GET_DEFAULT_TABLE_PROPERTIES = {
  clickedItemId: '',
  selectedTabId: FlyoutTabIds.METADATA,
  searchFilter: '',
  metadataSearch: '',
};
const HOST_TABLE_PROPERTIES_URL_STATE_KEY = 'hostFlyoutOpen';

type Action = rt.TypeOf<typeof ActionRT>;
export type SetNewHostFlyoutOpen = (newProp: Action) => void;
type SetNewHostFlyoutClose = () => void;

export const useHostFlyoutOpen = (): [
  HostFlyoutOpen,
  SetNewHostFlyoutOpen,
  SetNewHostFlyoutClose
] => {
  const [urlState, setUrlState] = useUrlState<HostFlyoutUrl>({
    defaultState: '',
    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_TABLE_PROPERTIES_URL_STATE_KEY,
  });

  const setHostFlyoutOpen = (newProps: Action) =>
    typeof urlState !== 'string'
      ? setUrlState({ ...urlState, ...newProps })
      : setUrlState({ ...GET_DEFAULT_TABLE_PROPERTIES, ...newProps });

  const setFlyoutClosed = () => setUrlState('');

  return [urlState as HostFlyoutOpen, setHostFlyoutOpen, setFlyoutClosed];
};

const FlyoutTabIdRT = rt.union([rt.literal('metadata'), rt.literal('processes')]);
const ClickedItemIdRT = rt.string;
const SearchFilterRT = rt.string;

const SetFlyoutTabId = rt.partial({
  selectedTabId: FlyoutTabIdRT,
});

const SetClickedItemIdRT = rt.partial({
  clickedItemId: ClickedItemIdRT,
});

const SetSearchFilterRT = rt.partial({
  searchFilter: SearchFilterRT,
});

const SetMetadataSearchRT = rt.partial({
  metadataSearch: SearchFilterRT,
});

const ActionRT = rt.intersection([
  SetClickedItemIdRT,
  SetFlyoutTabId,
  SetSearchFilterRT,
  SetMetadataSearchRT,
]);

const HostFlyoutOpenRT = rt.type({
  clickedItemId: ClickedItemIdRT,
  selectedTabId: FlyoutTabIdRT,
  searchFilter: SearchFilterRT,
  metadataSearch: SearchFilterRT,
});

const HostFlyoutUrlRT = rt.union([HostFlyoutOpenRT, rt.string]);

type HostFlyoutUrl = rt.TypeOf<typeof HostFlyoutUrlRT>;
type HostFlyoutOpen = rt.TypeOf<typeof HostFlyoutOpenRT>;

const encodeUrlState = HostFlyoutUrlRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(HostFlyoutUrlRT.decode(value), fold(constant('undefined'), identity));
};
