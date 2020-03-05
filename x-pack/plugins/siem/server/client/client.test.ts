/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SiemClient } from './client';
import { createMockConfig } from '../lib/detection_engine/routes/__mocks__';

describe('SiemClient', () => {
  describe('#signalsIndex', () => {
    it('returns the index scoped to the specified spaceId', () => {
      const mockConfig = createMockConfig();
      mockConfig.signalsIndex = 'mockSignalsIndex';
      const spaceId = 'fooSpace';
      const client = new SiemClient(spaceId, mockConfig);

      expect(client.signalsIndex).toEqual('mockSignalsIndex-fooSpace');
    });
  });
});
