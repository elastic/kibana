/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setArchiveEntry, setArchiveFilelist } from '../../../archive';

interface Assets {
  path: string;
  content: Buffer;
}
export const cacheAssets = (assets: Assets[], name: string, version: string) => {
  const paths = assets.map((asset) => asset.path);

  setArchiveFilelist({ name, version }, paths);

  assets.forEach((asset) => {
    setArchiveEntry(asset.path, asset.content);
  });

  return paths;
};
