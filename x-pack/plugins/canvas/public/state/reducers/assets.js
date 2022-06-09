/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions, combineActions } from 'redux-actions';
import immutable from 'object-path-immutable';
import { get } from 'lodash';
import { setAssetValue, removeAsset, setAssets, resetAssets, setAsset } from '../actions/assets';

const { set, assign, del } = immutable;

export const assetsReducer = handleActions(
  {
    [setAssetValue]: (assetState, { payload }) => {
      const { id, value } = payload;
      const asset = get(assetState, [id]);
      if (!asset) {
        throw new Error(`Can not set asset data, id not found: ${id}`);
      }
      return assign(assetState, id, { value });
    },
    [setAsset]: (assetState, { payload }) => {
      const { asset } = payload;
      return set(assetState, asset.id, asset);
    },
    [removeAsset]: (assetState, { payload: assetId }) => {
      return del(assetState, assetId);
    },

    [combineActions(setAssets, resetAssets)]: (_assetState, { payload }) => payload || {},
  },
  {}
);
