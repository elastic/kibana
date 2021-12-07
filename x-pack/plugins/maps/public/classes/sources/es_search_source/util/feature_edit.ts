/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Geometry, Position } from 'geojson';
import { set } from '@elastic/safer-lodash-set';
import {
  CHECK_IS_DRAWING_INDEX,
  GET_MATCHING_INDEXES_PATH,
  INDEX_FEATURE_PATH,
} from '../../../../../common/constants';
import { getHttp } from '../../../../kibana_services';

export const addFeatureToIndex = async (
  indexName: string,
  geometry: Geometry | Position[],
  path: string,
  defaultFields: Record<string, Record<string, string>>
) => {
  const data = set({ ...defaultFields }, path, geometry);
  return await getHttp().fetch({
    path: `${INDEX_FEATURE_PATH}`,
    method: 'POST',
    body: JSON.stringify({
      index: indexName,
      data,
    }),
  });
};

export const deleteFeatureFromIndex = async (indexName: string, featureId: string) => {
  return await getHttp().fetch({
    path: `${INDEX_FEATURE_PATH}/${featureId}`,
    method: 'DELETE',
    body: JSON.stringify({
      index: indexName,
    }),
  });
};

export const getMatchingIndexes = async (indexPattern: string) => {
  return await getHttp().fetch<{
    success: boolean;
    matchingIndexes: string[];
  }>({
    path: GET_MATCHING_INDEXES_PATH,
    method: 'GET',
    query: { indexPattern },
  });
};

export const getIsDrawLayer = async (index: string) => {
  return await getHttp().fetch<{
    success: boolean;
    isDrawingIndex: boolean;
  }>({
    path: CHECK_IS_DRAWING_INDEX,
    method: 'GET',
    query: { index },
  });
};
