/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import {
  getPreviewIndicesFromAutoFollowPattern,
  getPrefixSuffixFromFollowPattern,
} from './auto_follow_pattern';

describe('Auto-follo pattern service', () => {
  describe('getPreviewIndicesFromAutoFollowPattern()', () => {
    let prefix;
    let suffix;
    let leaderIndexPatterns;

    beforeEach(() => {
      prefix = 'prefix_';
      suffix = '_suffix';
      leaderIndexPatterns = ['logstash-*'];
    });

    it('should render a list of indices preview', () => {
      const { indicesPreview, hasMore } = getPreviewIndicesFromAutoFollowPattern({
        prefix,
        suffix,
        leaderIndexPatterns,
      });

      expect(hasMore).toBe(false);
      expect(indicesPreview.map((preview) => preview.toString)).toEqual([
        `prefix_logstash-${moment().format('YYYY-MM-DD')}_suffix`,
        `prefix_logstash-${moment().add(1, 'days').format('YYYY-MM-DD')}_suffix`,
        `prefix_logstash-${moment().add(2, 'days').format('YYYY-MM-DD')}_suffix`,
      ]);
    });

    it('should have a default limit of 5', () => {
      leaderIndexPatterns.push('other-*');

      const { indicesPreview, hasMore } = getPreviewIndicesFromAutoFollowPattern({
        prefix,
        suffix,
        leaderIndexPatterns,
      });

      expect(hasMore).toBe(true);
      expect(indicesPreview.map((preview) => preview.toString)).toEqual([
        `prefix_logstash-${moment().format('YYYY-MM-DD')}_suffix`,
        `prefix_logstash-${moment().add(1, 'days').format('YYYY-MM-DD')}_suffix`,
        `prefix_logstash-${moment().add(2, 'days').format('YYYY-MM-DD')}_suffix`,
        `prefix_other-${moment().format('YYYY-MM-DD')}_suffix`,
        `prefix_other-${moment().add(1, 'days').format('YYYY-MM-DD')}_suffix`,
      ]);
    });

    it('should allow custom limit and wildcard placeholder', () => {
      const limit = 2;
      const wildcardPlaceHolders = ['A', 'B', 'C'];
      const { indicesPreview } = getPreviewIndicesFromAutoFollowPattern({
        prefix,
        suffix,
        leaderIndexPatterns,
        limit,
        wildcardPlaceHolders,
      });

      expect(indicesPreview.map((preview) => preview.toString)).toEqual([
        'prefix_logstash-A_suffix',
        'prefix_logstash-B_suffix',
      ]);
    });
  });

  describe('getPrefixSuffixFromFollowPattern()', () => {
    it('should extract prefix and suffix from a {{leader_index}} template', () => {
      const result = getPrefixSuffixFromFollowPattern('prefix_{{leader_index}}_suffix');
      expect(result.followIndexPatternPrefix).toEqual('prefix_');
      expect(result.followIndexPatternSuffix).toEqual('_suffix');
    });
  });
});
