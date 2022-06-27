/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESAssetMetadata } from './meta';

describe('getESAssetMetadata', () => {
  describe('with package name', () => {
    it('generates expected JSON', () => {
      const packageName = 'foo';

      const meta = getESAssetMetadata({ packageName });

      expect(meta).toEqual({ managed_by: 'fleet', managed: true, package: { name: packageName } });
    });
  });

  describe('without package name', () => {
    it('generates expected JSON', () => {
      const meta = getESAssetMetadata();

      expect(meta).toEqual({ managed_by: 'fleet', managed: true });
    });
  });
});
