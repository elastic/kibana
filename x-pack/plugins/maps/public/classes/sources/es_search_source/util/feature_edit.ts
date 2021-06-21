/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Geometry, Position } from 'geojson';
import { set } from '@elastic/safer-lodash-set';
import { GET_MATCHING_INDEXES_PATH, INDEX_FEATURE_PATH } from '../../../../../common';
import { getHttp } from '../../../../kibana_services';

export const addFeatureToIndex = async (
  indexName: string,
  geometry: Geometry | Position[],
  path: string
) => {
  const data = set({}, path, geometry);
  return await getHttp().fetch({
    path: `${INDEX_FEATURE_PATH}`,
    method: 'POST',
    body: JSON.stringify({
      index: indexName,
      data,
    }),
  });
};

export const getMatchingIndexes = async (indexPattern: string) => {
  return await getHttp().fetch({
    path: `${GET_MATCHING_INDEXES_PATH}/${indexPattern}`,
    method: 'GET',
  });
};
