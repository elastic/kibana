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

const FLYOUT_TAB_ID_URL_STATE_KEY = 'flyoutTabId';

export const useFlyoutTabId = (
  initialValue: FlyoutTabId = FlyoutTabIds.METADATA
): [FlyoutTabId, TabIdUpdater] => {
  return useUrlState<FlyoutTabId>({
    defaultState: initialValue,
    decodeUrlState: makeDecodeUrlState(initialValue),
    encodeUrlState,
    urlStateKey: FLYOUT_TAB_ID_URL_STATE_KEY,
  });
};

const FlyoutTabIdRT = rt.union([rt.literal('metadata'), rt.literal('processes')]);

export enum FlyoutTabIds {
  METADATA = 'metadata',
  PROCESSES = 'processes',
}

type FlyoutTabId = rt.TypeOf<typeof FlyoutTabIdRT>;
type TabIdUpdater = (tabId: FlyoutTabId) => void;

const encodeUrlState = FlyoutTabIdRT.encode;
const makeDecodeUrlState = (initialValue: FlyoutTabId) => (value: unknown) => {
  return pipe(FlyoutTabIdRT.decode(value), fold(constant(initialValue), identity));
};
