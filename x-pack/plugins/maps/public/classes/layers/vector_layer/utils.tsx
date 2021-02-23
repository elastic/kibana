/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection } from 'geojson';
import { Map as MbMap } from 'mapbox-gl';
import {
  EMPTY_FEATURE_COLLECTION,
  SOURCE_DATA_REQUEST_ID,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import { DataRequestContext } from '../../../actions';
import { IVectorSource } from '../../sources/vector_source';
import { DataRequestAbortError } from '../../util/data_request';
import { DataRequest } from '../../util/data_request';
import { getCentroidFeatures } from '../../../../common/get_centroid_features';
import { canSkipSourceUpdate } from '../../util/can_skip_fetch';
import { assignFeatureIds } from './assign_feature_ids';

export function addGeoJsonMbSource(mbSourceId: string, mbLayerIds: string[], mbMap: MbMap) {
  const mbSource = mbMap.getSource(mbSourceId);
  if (!mbSource) {
    mbMap.addSource(mbSourceId, {
      type: 'geojson',
      data: EMPTY_FEATURE_COLLECTION,
    });
  } else if (mbSource.type !== 'geojson') {
    // Recreate source when existing source is not geojson. This can occur when layer changes from tile layer to vector layer.
    mbLayerIds.forEach((mbLayerId) => {
      if (mbMap.getLayer(mbLayerId)) {
        mbMap.removeLayer(mbLayerId);
      }
    });

    mbMap.removeSource(mbSourceId);
    mbMap.addSource(mbSourceId, {
      type: 'geojson',
      data: EMPTY_FEATURE_COLLECTION,
    });
  }
}

export async function syncVectorSource({
  layerId,
  layerName,
  prevDataRequest,
  requestMeta,
  syncContext,
  source,
}: {
  layerId: string;
  layerName: string;
  prevDataRequest: DataRequest | undefined;
  requestMeta: VectorSourceRequestMeta;
  syncContext: DataRequestContext;
  source: IVectorSource;
}): Promise<{ refreshed: boolean; featureCollection: FeatureCollection }> {
  const {
    startLoading,
    stopLoading,
    onLoadError,
    registerCancelCallback,
    isRequestStillActive,
  } = syncContext;
  const dataRequestId = SOURCE_DATA_REQUEST_ID;
  const requestToken = Symbol(`${layerId}-${dataRequestId}`);
  const canSkipFetch = await canSkipSourceUpdate({
    source,
    prevDataRequest,
    nextMeta: requestMeta,
  });
  if (canSkipFetch) {
    return {
      refreshed: false,
      featureCollection: prevDataRequest
        ? (prevDataRequest.getData() as FeatureCollection)
        : EMPTY_FEATURE_COLLECTION,
    };
  }

  try {
    startLoading(dataRequestId, requestToken, requestMeta);
    const { data: sourceFeatureCollection, meta } = await source.getGeoJsonWithMeta(
      layerName,
      requestMeta,
      registerCancelCallback.bind(null, requestToken),
      () => {
        return isRequestStillActive(dataRequestId, requestToken);
      }
    );
    const layerFeatureCollection = assignFeatureIds(sourceFeatureCollection);
    const supportedShapes = await source.getSupportedShapeTypes();
    if (
      supportedShapes.includes(VECTOR_SHAPE_TYPE.LINE) ||
      supportedShapes.includes(VECTOR_SHAPE_TYPE.POLYGON)
    ) {
      layerFeatureCollection.features.push(...getCentroidFeatures(layerFeatureCollection));
    }
    stopLoading(dataRequestId, requestToken, layerFeatureCollection, meta);
    return {
      refreshed: true,
      featureCollection: layerFeatureCollection,
    };
  } catch (error) {
    if (!(error instanceof DataRequestAbortError)) {
      onLoadError(dataRequestId, requestToken, error.message);
    }
    throw error;
  }
}
