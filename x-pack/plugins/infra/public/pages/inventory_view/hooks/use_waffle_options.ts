/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import {
  SnapshotMetricInput,
  SnapshotGroupBy,
  SnapshotCustomMetricInput,
  SnapshotMetricInputRT,
  SnapshotGroupByRT,
  SnapshotCustomMetricInputRT,
} from '../../../../common/http_api/snapshot_api';
import { useUrlState } from '../../../utils/use_url_state';
import { InventoryItemType, ItemTypeRT } from '../../../../common/inventory_models/types';

const DEFAULT_STATE: WaffleOptionsState = {
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
  const [state, setState] = useUrlState<WaffleOptionsState>({
    defaultState: DEFAULT_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleOptions',
  });

  const changeMetric = useCallback(
    (metric: SnapshotMetricInput) => setState({ ...state, metric }),
    [state, setState]
  );

  const changeGroupBy = useCallback((groupBy: SnapshotGroupBy) => setState({ ...state, groupBy }), [
    state,
    setState,
  ]);

  const changeNodeType = useCallback(
    (nodeType: InventoryItemType) => setState({ ...state, nodeType }),
    [state, setState]
  );

  const changeView = useCallback((view: string) => setState({ ...state, view }), [state, setState]);

  const changeCustomOptions = useCallback(
    (customOptions: Array<{ text: string; field: string }>) =>
      setState({ ...state, customOptions }),
    [state, setState]
  );

  const changeAutoBounds = useCallback(
    (autoBounds: boolean) => setState({ ...state, autoBounds }),
    [state, setState]
  );

  const changeBoundsOverride = useCallback(
    (boundsOverride: { min: number; max: number }) => setState({ ...state, boundsOverride }),
    [state, setState]
  );

  const changeAccount = useCallback((accountId: string) => setState({ ...state, accountId }), [
    state,
    setState,
  ]);

  const changeRegion = useCallback((region: string) => setState({ ...state, region }), [
    state,
    setState,
  ]);

  const changeCustomMetrics = useCallback(
    (customMetrics: SnapshotCustomMetricInput[]) => setState({ ...state, customMetrics }),
    [state, setState]
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
const encodeUrlState = WaffleOptionsStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(WaffleOptionsStateRT.decode(value), fold(constant(undefined), identity));
