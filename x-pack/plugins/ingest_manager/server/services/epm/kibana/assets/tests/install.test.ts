/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { getAssetId, changeAssetIds } from '../install';

expect.addSnapshotSerializer({
  print(val) {
    return JSON.stringify(val, null, 2);
  },

  test(val) {
    return val;
  },
});

describe('a kibana asset id and its reference ids are appended with package name', () => {
  const assetPath = path.join(__dirname, './dashboard.json');
  const kibanaAsset = JSON.parse(readFileSync(assetPath, 'utf-8'));
  const pkgName = 'nginx';
  const modifiedAssetObject = changeAssetIds(kibanaAsset, pkgName);

  test('changeAssetIds output matches snapshot', () => {
    expect(modifiedAssetObject).toMatchSnapshot(path.basename(assetPath));
  });

  test('getAssetId', () => {
    const id = '47a8e0f0-f1a4-11e7-a9ef-93c69af7b129-ecs';
    expect(getAssetId(id, pkgName)).toBe(`${pkgName}-${id}`);
  });
});
