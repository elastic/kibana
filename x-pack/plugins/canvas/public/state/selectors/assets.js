/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

const assetRoot = 'assets';

export function getAssets(state) {
  return get(state, assetRoot, {});
}

export function getAssetIds(state) {
  return Object.keys(getAssets(state));
}

export function getAssetById(state, id) {
  return get(state, [assetRoot, id]);
}
