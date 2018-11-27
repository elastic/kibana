/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  deserializeAutoFollowPattern,
  deserializeListAutoFollowPatterns,
  serializeAutoFollowPattern,
} from './auto_follow_pattern_serialization';

describe('[CCR] auto-follow_serialization', () => {
  describe('deserializeAutoFollowPattern()', () => {
    it('should return empty object if name or esObject are not provided', () => {
      expect(deserializeAutoFollowPattern()).toEqual({});
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

      expect(deserializeAutoFollowPattern('some-name', esObject)).toEqual(expected);
    });
  });

  describe('deserializeListAutoFollowPatterns()', () => {
    it('should deserialize list of Elasticsearch objects', () => {
      const name1 = 'foo1';
      const name2 = 'foo2';

      const expected = {
        [name1]: {
          name: name1,
          remoteCluster: 'foo1',
          leaderIndexPatterns: ['foo1-*'],
          followIndexPattern: 'bar2'
        },
        [name2]: {
          name: name2,
          remoteCluster: 'foo2',
          leaderIndexPatterns: ['foo2-*'],
          followIndexPattern: 'bar2'
        }
      };

      const esObjects = {
        [name1]: {
          remote_cluster: expected[name1].remoteCluster,
          leader_index_patterns: expected[name1].leaderIndexPatterns,
          follow_index_pattern: expected[name1].followIndexPattern
        },
        [name2]: {
          remote_cluster: expected[name2].remoteCluster,
          leader_index_patterns: expected[name2].leaderIndexPatterns,
          follow_index_pattern: expected[name2].followIndexPattern
        }
      };

      expect(deserializeListAutoFollowPatterns(esObjects)).toEqual(expected);
    });
  });

  describe('serializeAutoFollowPattern()', () => {
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

      expect(serializeAutoFollowPattern(object)).toEqual(expected);
    });
  });
});
