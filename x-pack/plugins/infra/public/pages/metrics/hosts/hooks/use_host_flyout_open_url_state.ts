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

export const GET_DEFAULT_TABLE_PROPERTIES = {
  isFlyoutOpen: false,
  clickedItemId: '',
};
const HOST_TABLE_PROPERTIES_URL_STATE_KEY = 'hostFlyoutOpen';

type Action = rt.TypeOf<typeof ActionRT>;
type SetNewHostFlyoutOpen = (newProps: Action) => void;

export const useHostFlyoutOpen = (): [HostFlyoutOpen, SetNewHostFlyoutOpen] => {
  const [urlState, setUrlState] = useUrlState<HostFlyoutOpen>({
    defaultState: GET_DEFAULT_TABLE_PROPERTIES,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_TABLE_PROPERTIES_URL_STATE_KEY,
  });

  const setHostFlyoutOpen = (newProps: Action) => setUrlState({ ...urlState, ...newProps });

  return [urlState, setHostFlyoutOpen];
};

const ClickedItemIdRT = rt.string;
const IsFlyoutOpenRT = rt.boolean;

const SetIsFlyoutOpenRT = rt.partial({
  isFlyoutOpen: IsFlyoutOpenRT,
});

const SetClickedItemIdRT = rt.partial({
  clickedItemId: ClickedItemIdRT,
});

const ActionRT = rt.intersection([SetIsFlyoutOpenRT, SetClickedItemIdRT]);

const HostFlyoutOpenRT = rt.type({
  clickedItemId: ClickedItemIdRT,
  isFlyoutOpen: IsFlyoutOpenRT,
});

type HostFlyoutOpen = rt.TypeOf<typeof HostFlyoutOpenRT>;

const encodeUrlState = HostFlyoutOpenRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(HostFlyoutOpenRT.decode(value), fold(constant(undefined), identity));
};
