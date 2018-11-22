/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeAutofollowPattern, serializeAutofolloPattern } from './autofollow_pattern_serialization';

describe('[CCR] auto-follow_serialization', () => {
  describe('deserializeAutofollowPattern()', () => {
    it('should return empty object if name is not provided', () => {
      expect(deserializeAutofollowPattern()).toEqual({});
    });

    it('should deserialize Elasticsearch object', () => {
      const expected = {
        name: 'some-name',
        remoteCluster: 'foo',
        leaderIndexPatterns: ['foo-*'],
        followIndexPattern: 'bar'
      };

      const esObject = {
        remote_cluster: expected.remoteCluster,
        leader_index_patterns: expected.leaderIndexPatterns,
        follow_index_pattern: expected.followIndexPattern
      };

      expect(deserializeAutofollowPattern('some-name', esObject)).toEqual(expected);
    });
  });

  describe('serializeAutofollowPattern()', () => {
    it('should serialize object to Elasticsearch object', () => {
      const expected = {
        remote_cluster: 'foo',
        leader_index_patterns: ['bar-*'],
        follow_index_pattern: 'faz'
      };

      const object = {
        remoteCluster: expected.remote_cluster,
        leaderIndexPatterns: expected.leader_index_patterns,
        followIndexPattern: expected.follow_index_pattern
      };

      expect(serializeAutofolloPattern(object)).toEqual(expected);
    });

  });

});
