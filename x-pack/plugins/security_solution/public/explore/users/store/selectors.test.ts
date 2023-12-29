/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGlobalState } from '../../../common/mock';
import { UserAssetTableType } from './model';
import { selectUserAssetTableById } from './selectors';

describe('Users store selector', () => {
  test('selectUserAssetTableById', () => {
    expect(selectUserAssetTableById(mockGlobalState, UserAssetTableType.assetOkta)).toBe(
      mockGlobalState.users.flyout.queries[UserAssetTableType.assetOkta]
    );
    expect(selectUserAssetTableById(mockGlobalState, UserAssetTableType.assetEntra)).toBe(
      mockGlobalState.users.flyout.queries[UserAssetTableType.assetEntra]
    );
  });
});
