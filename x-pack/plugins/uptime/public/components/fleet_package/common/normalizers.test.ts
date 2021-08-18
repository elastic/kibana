/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cronToSecondsNormalizer, jsonToArrayOrObjectNormalizer } from './normalizers';

describe('normalizers', () => {
  describe('cronToSecondsNormalizer', () => {
    it('returns number of seconds from cron formatted seconds', () => {
      expect(cronToSecondsNormalizer('3s')).toEqual('3');
    });
  });

  describe('jsonToArrayOrObjectNormalizer', () => {
    it('takes a json object string and returns an object', () => {
      expect(jsonToArrayOrObjectNormalizer('{\n    "key": "value"\n}')).toEqual({
        key: 'value',
      });
    });

    it('takes a json array string and returns an array', () => {
      expect(jsonToArrayOrObjectNormalizer('["tag1","tag2"]')).toEqual(['tag1', 'tag2']);
    });
  });
});
