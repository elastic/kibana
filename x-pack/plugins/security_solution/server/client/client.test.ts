/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SIGNALS_INDEX_KEY } from '../../common/constants';
import { createMockConfig } from '../lib/detection_engine/routes/__mocks__';
import { AppClient } from './client';

describe('SiemClient', () => {
  describe('#getSignalsIndex', () => {
    it('returns the index scoped to the specified spaceId', () => {
      const mockConfig = {
        ...createMockConfig(),
        [SIGNALS_INDEX_KEY]: 'mockSignalsIndex',
      };
      const spaceId = 'fooSpace';
      const client = new AppClient(spaceId, mockConfig);

      expect(client.getSignalsIndex()).toEqual('mockSignalsIndex-fooSpace');
    });
  });
});
