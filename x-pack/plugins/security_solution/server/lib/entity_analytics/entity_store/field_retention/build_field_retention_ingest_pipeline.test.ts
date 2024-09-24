/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertPathToBracketNotation,
  getProgressivePathsNoCtx,
} from './build_field_retention_ingest_pipeline';

describe('buildFieldRetentionIngestPipeline', () => {
  describe('convertPathToBracketNotation', () => {
    it('should do nothing with single value', () => {
      const path = 'a';
      const result = convertPathToBracketNotation(path);
      expect(result).toEqual('a');
    });
    it('should convert a path to bracket notation', () => {
      const path = 'a.b.c';
      const result = convertPathToBracketNotation(path);
      expect(result).toEqual("a['b']['c']");
    });
  });

  describe('getProgressivePathsNoCtx', () => {
    it('should handle no brackets', () => {
      const result = getProgressivePathsNoCtx('a');
      expect(result).toEqual(['a']);
    });
    it('should get progressive paths for a path without ctx', () => {
      const result = getProgressivePathsNoCtx("a['b']['c']");
      expect(result).toEqual(['a', "a['b']", "a['b']['c']"]);
    });
    it('should get progressive paths for a path with ctx and omit ctx', () => {
      const result = getProgressivePathsNoCtx("ctx['a']['b']['c']");
      expect(result).toEqual(["ctx['a']", "ctx['a']['b']", "ctx['a']['b']['c']"]);
    });
  });
});
