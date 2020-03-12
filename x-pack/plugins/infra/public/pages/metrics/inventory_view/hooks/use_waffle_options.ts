/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState, useEffect } from 'react';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import createContainer from 'constate';
import {
  SnapshotMetricInput,
  SnapshotGroupBy,
  SnapshotCustomMetricInput,
  SnapshotMetricInputRT,
  SnapshotGroupByRT,
  SnapshotCustomMetricInputRT,
} from '../../../../../common/http_api/snapshot_api';
import { useUrlState } from '../../../../utils/use_url_state';
import { InventoryItemType, ItemTypeRT } from '../../../../../common/inventory_models/types';

export const DEFAULT_WAFFLE_OPTIONS_STATE: WaffleOptionsState = {
  metric: { type: 'cpu' },
  groupBy: [],
  nodeType: 'host',
  view: 'map',
  customOptions: [],
  boundsOverride: { max: 1, min: 0 },
  autoBounds: true,
  accountId: '',
  region: '',
  customMetrics: [],
};

export const useWaffleOptions = () => {
  const [urlState, setUrlState] = useUrlState<WaffleOptionsState>({
    defaultState: DEFAULT_WAFFLE_OPTIONS_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleOptions',
  });

  const [state, setState] = useState<WaffleOptionsState>(urlState);

  useEffect(() => setUrlState(state), [setUrlState, state]);

  const changeMetric = useCallback(
    (metric: SnapshotMetricInput) => setState(previous => ({ ...previous, metric })),
    [setState]
  );

  const changeGroupBy = useCallback(
    (groupBy: SnapshotGroupBy) => setState(previous => ({ ...previous, groupBy })),
    [setState]
  );

  const changeNodeType = useCallback(
    (nodeType: InventoryItemType) => setState(previous => ({ ...previous, nodeType })),
    [setState]
  );

  const changeView = useCallback((view: string) => setState(previous => ({ ...previous, view })), [
    setState,
  ]);

  const changeCustomOptions = useCallback(
    (customOptions: Array<{ text: string; field: string }>) =>
      setState(previous => ({ ...previous, customOptions })),
    [setState]
  );

  const changeAutoBounds = useCallback(
    (autoBounds: boolean) => setState(previous => ({ ...previous, autoBounds })),
    [setState]
  );

  const changeBoundsOverride = useCallback(
    (boundsOverride: { min: number; max: number }) =>
      setState(previous => ({ ...previous, boundsOverride })),
    [setState]
  );

  const changeAccount = useCallback(
    (accountId: string) => setState(previous => ({ ...previous, accountId })),
    [setState]
  );

  const changeRegion = useCallback(
    (region: string) => setState(previous => ({ ...previous, region })),
    [setState]
  );

  const changeCustomMetrics = useCallback(
    (customMetrics: SnapshotCustomMetricInput[]) => {
      setState(previous => ({ ...previous, customMetrics }));
    },
    [setState]
  );

  return {
    ...state,
    changeMetric,
    changeGroupBy,
    changeNodeType,
    changeView,
    changeCustomOptions,
    changeAutoBounds,
    changeBoundsOverride,
    changeAccount,
    changeRegion,
    changeCustomMetrics,
    setWaffleOptionsState: setState,
  };
};

export const WaffleOptionsStateRT = rt.type({
  metric: SnapshotMetricInputRT,
  groupBy: SnapshotGroupByRT,
  nodeType: ItemTypeRT,
  view: rt.string,
  customOptions: rt.array(
    rt.type({
      text: rt.string,
      field: rt.string,
    })
  ),
  boundsOverride: rt.type({
    min: rt.number,
    max: rt.number,
  }),
  autoBounds: rt.boolean,
  accountId: rt.string,
  region: rt.string,
  customMetrics: rt.array(SnapshotCustomMetricInputRT),
});

export type WaffleOptionsState = rt.TypeOf<typeof WaffleOptionsStateRT>;
const encodeUrlState = (state: WaffleOptionsState) => {
  return WaffleOptionsStateRT.encode(state);
};
const decodeUrlState = (value: unknown) =>
  pipe(WaffleOptionsStateRT.decode(value), fold(constant(undefined), identity));

export const WaffleOptions = createContainer(useWaffleOptions);
export const [WaffleOptionsProvider, useWaffleOptionsContext] = WaffleOptions;
