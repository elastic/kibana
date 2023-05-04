/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getAsset } from '../../archive';

// Index alias that points to just one destination index from the latest package version
export const TRANSFORM_DEST_IDX_ALIAS_LATEST_SFX = '.latest';
// Index alias that points to all of the destination indices from all the package versions
export const TRANSFORM_DEST_IDX_ALIAS_ALL_SFX = '.all';
