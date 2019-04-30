/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { parseCrossClusterPrefix, prefixIndexPattern } from '../ccs_utils';

describe('ccs_utils', () => {
  describe('prefixIndexPattern', () => {
    const indexPattern = '.monitoring-xyz-1-*,.monitoring-xyz-2-*';

    it('returns the index pattern if ccs is not enabled', () => {
      const get = sinon.stub();
      const config = { get };

      get.withArgs('xpack.monitoring.ccs.enabled').returns(false);

      // falsy string values should be ignored
      const allPattern = prefixIndexPattern(config, indexPattern, '*');
      const onePattern = prefixIndexPattern(config, indexPattern, 'do_not_use_me');

      expect(allPattern).to.be(indexPattern);
      expect(onePattern).to.be(indexPattern);
      expect(get.callCount).to.eql(2);
    });

    it('returns the index pattern if ccs is not used', () => {
      const get = sinon.stub();
      const config = { get };

      get.withArgs('xpack.monitoring.ccs.enabled').returns(true);

      // falsy string values should be ignored
      const undefinedPattern = prefixIndexPattern(config, indexPattern);
      const nullPattern = prefixIndexPattern(config, indexPattern, null);
      const blankPattern = prefixIndexPattern(config, indexPattern, '');

      expect(undefinedPattern).to.be(indexPattern);
      expect(nullPattern).to.be(indexPattern);
      expect(blankPattern).to.be(indexPattern);
      expect(get.callCount).to.eql(3);
    });

    it('returns the ccs-prefixed index pattern', () => {
      const get = sinon.stub();
      const config = { get };

      get.withArgs('xpack.monitoring.ccs.enabled').returns(true);

      const abcPattern = prefixIndexPattern(config, indexPattern, 'aBc');
      const underscorePattern = prefixIndexPattern(config, indexPattern, 'cluster_one');

      expect(abcPattern).to.eql('aBc:.monitoring-xyz-1-*,aBc:.monitoring-xyz-2-*');
      expect(underscorePattern).to.eql('cluster_one:.monitoring-xyz-1-*,cluster_one:.monitoring-xyz-2-*');
      expect(get.callCount).to.eql(2);
    });

    it('returns the ccs-prefixed index pattern when wildcard and the local cluster pattern', () => {
      const get = sinon.stub();
      const config = { get };

      get.withArgs('xpack.monitoring.ccs.enabled').returns(true);

      const pattern = prefixIndexPattern(config, indexPattern, '*');

      // it should have BOTH patterns so that it searches all CCS clusters and the local cluster
      expect(pattern).to.eql('*:.monitoring-xyz-1-*,*:.monitoring-xyz-2-*' + ',' + indexPattern);
      expect(get.callCount).to.eql(1);
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
