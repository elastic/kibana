/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { constant, identity } from 'fp-ts/lib/function';
import { useUrlState } from '../../../../utils/use_url_state';

export const tabIds: Record<string, TabId> = {
  ALERTS: 'alerts',
  METRICS: 'metrics',
};

export const useTabId = (defaultState: TabId = tabIds.METRICS) => {
  return useUrlState<TabId>({
    defaultState,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'tabId',
    writeDefaultState: true,
  });
};

const TabIdRT = rt.union([rt.literal('alerts'), rt.literal('metrics')]);

export type TabId = rt.TypeOf<typeof TabIdRT>;

const encodeUrlState = TabIdRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(TabIdRT.decode(value), fold(constant(tabIds.METRICS), identity));
};
