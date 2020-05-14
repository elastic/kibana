/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, combineActions } from 'redux-actions';
import immutable from 'object-path-immutable';
import { get } from 'lodash';
import { createAsset, setAssetValue, removeAsset, setAssets, resetAssets } from '../actions/assets';
import { getId } from '../../lib/get_id';

const { set, assign, del } = immutable;

export const assetsReducer = handleActions(
  {
    [createAsset]: (assetState, { payload }) => {
      const asset = {
        id: getId('asset'),
        '@created': new Date().toISOString(),
        ...payload,
      };
      return set(assetState, asset.id, asset);
    },

    [setAssetValue]: (assetState, { payload }) => {
      const { id, value } = payload;
      const asset = get(assetState, [id]);
      if (!asset) {
        throw new Error(`Can not set asset data, id not found: ${id}`);
      }
      return assign(assetState, id, { value });
    },

    [removeAsset]: (assetState, { payload: assetId }) => {
      return del(assetState, assetId);
    },

    [combineActions(setAssets, resetAssets)]: (_assetState, { payload }) => payload || {},
  },
  {}
);
