/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrow } from '../../../common/api/runtime_types';
import { ConfigurationPartialAttributesRt } from './configure';

describe('Configuration', () => {
  describe('ConfigurationPartialAttributesRt', () => {
    it('strips excess fields from the result', () => {
      const res = decodeOrThrow(ConfigurationPartialAttributesRt)({
        bananas: 'yes',
        created_at: '123',
      });

      expect(res).toMatchObject({
        created_at: '123',
      });
    });

    it('should not throw even with an empty object', () => {
      expect(() => decodeOrThrow(ConfigurationPartialAttributesRt)({})).not.toThrow();
    });
  });
});
