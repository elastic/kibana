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

const TAB_ID_URL_STATE_KEY = 'tabId';

export const useTabId = (initialValue: TabId = TabIds.METRICS): [TabId, TabIdUpdater] => {
  return useUrlState<TabId>({
    defaultState: initialValue,
    decodeUrlState: makeDecodeUrlState(initialValue),
    encodeUrlState,
    urlStateKey: TAB_ID_URL_STATE_KEY,
  });
};

const TabIdRT = rt.union([rt.literal('alerts'), rt.literal('logs'), rt.literal('metrics')]);

export enum TabIds {
  ALERTS = 'alerts',
  LOGS = 'logs',
  METRICS = 'metrics',
}

type TabId = rt.TypeOf<typeof TabIdRT>;
type TabIdUpdater = (tabId: TabId) => void;

const encodeUrlState = TabIdRT.encode;
const makeDecodeUrlState = (initialValue: TabId) => (value: unknown) => {
  return pipe(TabIdRT.decode(value), fold(constant(initialValue), identity));
};
