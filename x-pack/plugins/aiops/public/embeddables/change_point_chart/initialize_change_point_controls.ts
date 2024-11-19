/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import fastIsEqual from 'fast-deep-equal';
import { BehaviorSubject } from 'rxjs';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointComponentApi, ChangePointEmbeddableState } from './types';

type ChangePointEmbeddableCustomState = Omit<
  ChangePointEmbeddableState,
  'timeRange' | 'title' | 'description' | 'hidePanelTitles'
>;

export const initializeChangePointControls = (rawState: ChangePointEmbeddableState) => {
  const viewType = new BehaviorSubject<ChangePointDetectionViewType>(rawState.viewType);
  const dataViewId = new BehaviorSubject<string>(rawState.dataViewId);
  const fn = new BehaviorSubject(rawState.fn);
  const metricField = new BehaviorSubject(rawState.metricField);
  const splitField = new BehaviorSubject(rawState.splitField);
  const partitions = new BehaviorSubject(rawState.partitions);
  const maxSeriesToPlot = new BehaviorSubject(rawState.maxSeriesToPlot);

  const updateUserInput = (update: ChangePointEmbeddableCustomState) => {
    viewType.next(update.viewType);
    dataViewId.next(update.dataViewId);
    fn.next(update.fn);
    metricField.next(update.metricField);
    splitField.next(update.splitField);
    partitions.next(update.partitions);
    maxSeriesToPlot.next(update.maxSeriesToPlot);
  };

  const serializeChangePointChartState = (): ChangePointEmbeddableCustomState => {
    return {
      viewType: viewType.getValue(),
      dataViewId: dataViewId.getValue(),
      fn: fn.getValue(),
      metricField: metricField.getValue(),
      splitField: splitField.getValue(),
      partitions: partitions.getValue(),
      maxSeriesToPlot: maxSeriesToPlot.getValue(),
    };
  };

  const changePointControlsComparators: StateComparators<ChangePointEmbeddableCustomState> = {
    viewType: [viewType, (arg) => viewType.next(arg)],
    dataViewId: [dataViewId, (arg) => dataViewId.next(arg)],
    fn: [fn, (arg) => fn.next(arg)],
    metricField: [metricField, (arg) => metricField.next(arg)],
    splitField: [splitField, (arg) => splitField.next(arg)],
    partitions: [partitions, (arg) => partitions.next(arg), fastIsEqual],
    maxSeriesToPlot: [maxSeriesToPlot, (arg) => maxSeriesToPlot.next(arg)],
  };

  return {
    changePointControlsApi: {
      viewType,
      dataViewId,
      fn,
      metricField,
      splitField,
      partitions,
      maxSeriesToPlot,
      updateUserInput,
    } as unknown as ChangePointComponentApi,
    serializeChangePointChartState,
    changePointControlsComparators,
  };
};
