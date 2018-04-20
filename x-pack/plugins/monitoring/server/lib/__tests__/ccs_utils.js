/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import { parseCrossClusterPrefix, prefixIndexPattern } from '../ccs_utils';

describe('ccs_utils', () => {
  describe('prefixIndexPattern', () => {
    const indexPatternName = 'xyz';
    const indexPattern = '.monitoring-xyz-1-*,.monitoring-xyz-2-*';

    it('returns the index pattern if ccs is not enabled', () => {
      const get = sinon.stub();
      const config = { get };

      get.withArgs(indexPatternName).returns(indexPattern);
      get.withArgs('xpack.monitoring.ccs.enabled').returns(false);

      // falsey string values should be ignored
      const allPattern = prefixIndexPattern(config, indexPatternName, '*');
      const onePattern = prefixIndexPattern(config, indexPatternName, 'do_not_use_me');

      expect(allPattern).to.be(indexPattern);
      expect(onePattern).to.be(indexPattern);
      // uses the config and indexPatternName supplied
      expect(get.callCount).to.eql(4);
    });

    it('returns the index pattern if ccs is not used', () => {
      const get = sinon.stub();
      const config = { get };

      get.withArgs(indexPatternName).returns(indexPattern);
      get.withArgs('xpack.monitoring.ccs.enabled').returns(true);

      // falsey string values should be ignored
      const undefinedPattern = prefixIndexPattern(config, indexPatternName);
      const nullPattern = prefixIndexPattern(config, indexPatternName, null);
      const blankPattern = prefixIndexPattern(config, indexPatternName, '');

      expect(undefinedPattern).to.be(indexPattern);
      expect(nullPattern).to.be(indexPattern);
      expect(blankPattern).to.be(indexPattern);
      // uses the config and indexPatternName supplied
      expect(get.callCount).to.eql(6);
    });

    it('returns the ccs-prefixed index pattern', () => {
      const get = sinon.stub();
      const config = { get };

      get.withArgs(indexPatternName).returns(indexPattern);
      get.withArgs('xpack.monitoring.ccs.enabled').returns(true);

      const abcPattern = prefixIndexPattern(config, indexPatternName, 'aBc');
      const underscorePattern = prefixIndexPattern(config, indexPatternName, 'cluster_one');

      expect(abcPattern).to.eql('aBc:.monitoring-xyz-1-*,aBc:.monitoring-xyz-2-*');
      expect(underscorePattern).to.eql('cluster_one:.monitoring-xyz-1-*,cluster_one:.monitoring-xyz-2-*');

      // uses the config and indexPatternName supplied, but only calls once
      expect(get.callCount).to.eql(4);
    });

    it('returns the ccs-prefixed index pattern when wildcard and the local cluster pattern', () => {
      const get = sinon.stub();
      const config = { get };

      get.withArgs(indexPatternName).returns(indexPattern);
      get.withArgs('xpack.monitoring.ccs.enabled').returns(true);

      const pattern = prefixIndexPattern(config, indexPatternName, '*');

      // it should have BOTH patterns so that it searches all CCS clusters and the local cluster
      expect(pattern).to.eql('*:.monitoring-xyz-1-*,*:.monitoring-xyz-2-*' + ',' + indexPattern);

      // uses the config and indexPatternName supplied, but only calls once
      expect(get.callCount).to.eql(2);
    });
  });

  describe('parseCrossClusterPrefix', () => {
    it('returns ccs prefix for index with one', () => {
      expect(parseCrossClusterPrefix('abc:.monitoring-es-6-2017.07.28')).to.eql('abc');
      expect(parseCrossClusterPrefix('abc_123:.monitoring-es-6-2017.07.28')).to.eql('abc_123');
      expect(parseCrossClusterPrefix('broken:example:.monitoring-es-6-2017.07.28')).to.eql('broken');
      expect(parseCrossClusterPrefix('with-a-dash:.monitoring-es-6-2017.07.28')).to.eql('with-a-dash');
      expect(parseCrossClusterPrefix('something:not-monitoring')).to.eql('something');
    });

    it('returns null when no prefix exists', () => {
      expect(parseCrossClusterPrefix('.monitoring-es-6-2017.07.28')).to.be(null);
      expect(parseCrossClusterPrefix('random')).to.be(null);
    });
  });
});
