/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_DATA_REQUEST_ID } from '../../../common/constants';
import { findLayerById, setLayer } from './layer_utils';
import { DataRequestMeta, DataRequestDescriptor } from '../../../common/descriptor_types';
import { MapState } from './types';

export function startDataRequest(
  state: MapState,
  layerId: string,
  dataRequestId: string,
  requestToken: symbol,
  requestMeta: DataRequestMeta
): MapState {
  const layerDescriptor = findLayerById(state, layerId);
  if (!layerDescriptor) {
    return state;
  }

  const prevDataRequest = getDataRequest(state, layerId, dataRequestId);
  const dataRequest = prevDataRequest
    ? {
        ...prevDataRequest,
      }
    : {
        dataId: dataRequestId,
      };
  dataRequest.dataRequestMetaAtStart = requestMeta;
  dataRequest.dataRequestToken = requestToken;
  return setDataRequest(state, layerId, dataRequest);
}

export function updateSourceDataRequest(
  state: MapState,
  layerId: string,
  newData: object
): MapState {
  const dataRequest = getDataRequest(state, layerId, SOURCE_DATA_REQUEST_ID);
  return dataRequest ? setDataRequest(state, layerId, { ...dataRequest, data: newData }) : state;
}

export function stopDataRequest(
  state: MapState,
  layerId: string,
  dataRequestId: string,
  requestToken: symbol,
  responseMeta?: DataRequestMeta,
  data?: object
): MapState {
  const dataRequest = getDataRequest(state, layerId, dataRequestId, requestToken);
  return dataRequest
    ? setDataRequest(state, layerId, {
        ...dataRequest,
        data,
        dataRequestMeta: {
          ...(dataRequest.dataRequestMetaAtStart ? dataRequest.dataRequestMetaAtStart : {}),
          ...(responseMeta ? responseMeta : {}),
          requestStopTime: Date.now(),
        },
        dataRequestMetaAtStart: undefined,
        dataRequestToken: undefined, // active data request
      })
    : state;
}

export function setDataRequest(
  state: MapState,
  layerId: string,
  dataRequest: DataRequestDescriptor
): MapState {
  const layerDescriptor = findLayerById(state, layerId);
  if (!layerDescriptor) {
    return state;
  }

  const updatedLayerDescriptor = {
    ...layerDescriptor,
    __dataRequests: layerDescriptor.__dataRequests ? [...layerDescriptor.__dataRequests] : [],
  };

  const dataRequestIndex = updatedLayerDescriptor.__dataRequests.findIndex(
    ({ dataId }) => dataRequest.dataId === dataId
  );
  if (dataRequestIndex === -1) {
    updatedLayerDescriptor.__dataRequests.push(dataRequest);
  } else {
    updatedLayerDescriptor.__dataRequests[dataRequestIndex] = dataRequest;
  }
  return {
    ...state,
    layerList: setLayer(state.layerList, updatedLayerDescriptor),
  };
}

export function getDataRequest(
  state: MapState,
  layerId: string,
  dataRequestId: string,
  requestToken?: symbol
): DataRequestDescriptor | undefined {
  const layerDescriptor = findLayerById(state, layerId);
  if (!layerDescriptor || !layerDescriptor.__dataRequests) {
    return;
  }

  return layerDescriptor.__dataRequests.find((dataRequest) => {
    return requestToken
      ? dataRequest.dataRequestToken === requestToken && dataRequest.dataId === dataRequestId
      : dataRequest.dataId === dataRequestId;
  });
}
