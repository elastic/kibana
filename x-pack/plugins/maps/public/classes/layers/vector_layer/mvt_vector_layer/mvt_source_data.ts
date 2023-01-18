/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';
import { SOURCE_DATA_REQUEST_ID } from '../../../../../common/constants';
import { Timeslice, VectorSourceRequestMeta } from '../../../../../common/descriptor_types';
import { DataRequest } from '../../../util/data_request';
import { DataRequestContext } from '../../../../actions';
import { canSkipSourceUpdate } from '../../../util/can_skip_fetch';
import { IMvtVectorSource } from '../../../sources/vector_source';

// shape of sourceDataRequest.getData()
export interface MvtSourceData {
  tileSourceLayer: string;
  tileMinZoom: number;
  tileMaxZoom: number;
  tileUrl: string;
  refreshToken: string;
  hasLabels: boolean;
}

export async function syncMvtSourceData({
  hasLabels,
  layerId,
  layerName,
  prevDataRequest,
  requestMeta,
  source,
  syncContext,
}: {
  hasLabels: boolean;
  layerId: string;
  layerName: string;
  prevDataRequest: DataRequest | undefined;
  requestMeta: VectorSourceRequestMeta;
  source: IMvtVectorSource;
  syncContext: DataRequestContext;
}): Promise<void> {
  const requestToken: symbol = Symbol(`${layerId}-${SOURCE_DATA_REQUEST_ID}`);

  const prevData = prevDataRequest ? (prevDataRequest.getData() as MvtSourceData) : undefined;

  if (prevData) {
    const noChangesInSourceState: boolean =
      prevData.tileSourceLayer === source.getTileSourceLayer() &&
      prevData.tileMinZoom === source.getMinZoom() &&
      prevData.tileMaxZoom === source.getMaxZoom();
    const noChangesInSearchState: boolean = await canSkipSourceUpdate({
      extentAware: false, // spatial extent knowledge is already fully automated by tile-loading based on pan-zooming
      source,
      prevDataRequest,
      nextRequestMeta: requestMeta,
      getUpdateDueToTimeslice: (timeslice?: Timeslice) => {
        return true;
      },
    });
    const canSkip =
      !syncContext.forceRefreshDueToDrawing &&
      noChangesInSourceState &&
      noChangesInSearchState &&
      prevData.hasLabels === hasLabels;

    if (canSkip) {
      return;
    }
  }

  syncContext.startLoading(SOURCE_DATA_REQUEST_ID, requestToken, requestMeta);
  try {
    const refreshToken =
      !prevData ||
      syncContext.forceRefreshDueToDrawing ||
      (requestMeta.isForceRefresh && requestMeta.applyForceRefresh)
        ? uuid()
        : prevData.refreshToken;

    const tileUrl = await source.getTileUrl(requestMeta, refreshToken, hasLabels);
    if (source.isESSource()) {
      syncContext.inspectorAdapters.vectorTiles.addLayer(layerId, layerName, tileUrl);
    }
    const sourceData = {
      tileUrl,
      tileSourceLayer: source.getTileSourceLayer(),
      tileMinZoom: source.getMinZoom(),
      tileMaxZoom: source.getMaxZoom(),
      refreshToken,
      hasLabels,
    };
    syncContext.stopLoading(SOURCE_DATA_REQUEST_ID, requestToken, sourceData, {});
  } catch (error) {
    syncContext.onLoadError(SOURCE_DATA_REQUEST_ID, requestToken, error.message);
  }
}
