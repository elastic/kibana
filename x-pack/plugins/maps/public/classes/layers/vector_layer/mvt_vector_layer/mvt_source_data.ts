/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid/v4';
import { parse as parseUrl } from 'url';
import { SOURCE_DATA_REQUEST_ID } from '../../../../../common/constants';
import { Timeslice, VectorSourceRequestMeta } from '../../../../../common/descriptor_types';
import { DataRequest } from '../../../util/data_request';
import { DataRequestContext } from '../../../../actions';
import { canSkipSourceUpdate } from '../../../util/can_skip_fetch';
import {
  ITiledSingleLayerMvtParams,
  ITiledSingleLayerVectorSource,
} from '../../../sources/tiled_single_layer_vector_source';

// shape of sourceDataRequest.getData()
export type MvtSourceData = ITiledSingleLayerMvtParams & {
  urlTemplate: string;
  urlToken: string;
};

export async function syncMvtSourceData({
  layerId,
  prevDataRequest,
  requestMeta,
  source,
  syncContext,
}: {
  layerId: string;
  prevDataRequest: DataRequest | undefined;
  requestMeta: VectorSourceRequestMeta;
  source: ITiledSingleLayerVectorSource;
  syncContext: DataRequestContext;
}): Promise<void> {
  const requestToken: symbol = Symbol(`${layerId}-${SOURCE_DATA_REQUEST_ID}`);

  const prevData = prevDataRequest ? (prevDataRequest.getData() as MvtSourceData) : undefined;

  if (prevData) {
    const noChangesInSourceState: boolean =
      prevData.layerName === source.getLayerName() &&
      prevData.minSourceZoom === source.getMinZoom() &&
      prevData.maxSourceZoom === source.getMaxZoom();
    const noChangesInSearchState: boolean = await canSkipSourceUpdate({
      extentAware: false, // spatial extent knowledge is already fully automated by tile-loading based on pan-zooming
      source,
      prevDataRequest,
      nextRequestMeta: requestMeta,
      getUpdateDueToTimeslice: (timeslice?: Timeslice) => {
        // TODO use meta features to determine if tiles already contain features for timeslice.
        return true;
      },
    });
    const canSkip = noChangesInSourceState && noChangesInSearchState;

    if (canSkip) {
      return;
    }
  }

  syncContext.startLoading(SOURCE_DATA_REQUEST_ID, requestToken, requestMeta);
  try {
    const urlToken =
      !prevData || (requestMeta.isForceRefresh && requestMeta.applyForceRefresh)
        ? uuid()
        : prevData.urlToken;

    const newUrlTemplateAndMeta = await source.getUrlTemplateWithMeta(requestMeta);

    let urlTemplate;
    if (newUrlTemplateAndMeta.refreshTokenParamName) {
      const parsedUrl = parseUrl(newUrlTemplateAndMeta.urlTemplate, true);
      const separator = !parsedUrl.query || Object.keys(parsedUrl.query).length === 0 ? '?' : '&';
      urlTemplate = `${newUrlTemplateAndMeta.urlTemplate}${separator}${newUrlTemplateAndMeta.refreshTokenParamName}=${urlToken}`;
    } else {
      urlTemplate = newUrlTemplateAndMeta.urlTemplate;
    }

    const sourceData = {
      ...newUrlTemplateAndMeta,
      urlToken,
      urlTemplate,
    };
    syncContext.stopLoading(SOURCE_DATA_REQUEST_ID, requestToken, sourceData, {});
  } catch (error) {
    syncContext.onLoadError(SOURCE_DATA_REQUEST_ID, requestToken, error.message);
  }
}
