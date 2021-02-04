/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const findExistingAsset = (type, content, assets) => {
  const existingId = Object.keys(assets).find(
    (assetId) => assets[assetId].type === type && assets[assetId].value === content
  );
  return existingId;
};
