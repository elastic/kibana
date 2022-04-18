/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@kbn/data-plugin/common';
import { SOURCE_BOUNDS_DATA_REQUEST_ID } from '../../../../common/constants';
import { MapExtent } from '../../../../common/descriptor_types';
import { DataRequestContext } from '../../../actions';
import { IVectorSource } from '../../sources/vector_source';

export async function syncBoundsData({
  layerId,
  syncContext,
  source,
  sourceQuery,
}: {
  layerId: string;
  syncContext: DataRequestContext;
  source: IVectorSource;
  sourceQuery: Query | null;
}): Promise<MapExtent | null> {
  const { startLoading, stopLoading, registerCancelCallback, dataFilters } = syncContext;

  const requestToken = Symbol(`${SOURCE_BOUNDS_DATA_REQUEST_ID}-${layerId}`);

  // Do not pass all searchFilters to source.getBoundsForFilters().
  // For example, do not want to filter bounds request by extent and buffer.
  const boundsFilters = {
    sourceQuery: sourceQuery ? sourceQuery : undefined,
    query: dataFilters.query,
    timeFilters: dataFilters.timeFilters,
    timeslice: dataFilters.timeslice,
    filters: dataFilters.filters,
    applyGlobalQuery: source.getApplyGlobalQuery(),
    applyGlobalTime: source.getApplyGlobalTime(),
  };

  let bounds = null;
  try {
    startLoading(SOURCE_BOUNDS_DATA_REQUEST_ID, requestToken, boundsFilters);
    bounds = await source.getBoundsForFilters(
      boundsFilters,
      registerCancelCallback.bind(null, requestToken)
    );
  } finally {
    // Use stopLoading callback instead of onLoadError callback.
    // Function is loading bounds and not feature data.
    stopLoading(SOURCE_BOUNDS_DATA_REQUEST_ID, requestToken, bounds ? bounds : {});
  }
  return bounds;
}
