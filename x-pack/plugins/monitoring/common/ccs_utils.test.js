/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parseCrossClusterPrefix, prefixIndexPatternWithCcs } from './ccs_utils';

// TODO: tests were not running and are not updated.
// They need to be changed to run.
describe.skip('ccs_utils', () => {
  describe('prefixIndexPatternWithCcs', () => {
    const indexPattern = '.monitoring-xyz-1-*,.monitoring-xyz-2-*';

    it('returns the index pattern if ccs is not enabled', () => {
      // TODO apply as MonitoringConfig during typescript conversion
      const config = { ui: { css: { enabled: false } } };

      // falsy string values should be ignored
      const allPattern = prefixIndexPatternWithCcs(config, indexPattern, '*');
      const onePattern = prefixIndexPatternWithCcs(config, indexPattern, 'do_not_use_me');

      expect(allPattern).to.be(indexPattern);
      expect(onePattern).to.be(indexPattern);
    });

    it('returns the index pattern if ccs is not used', () => {
      // TODO apply as MonitoringConfig during typescript conversion
      const config = { ui: { css: { enabled: true } } };

      // falsy string values should be ignored
      const undefinedPattern = prefixIndexPatternWithCcs(config, indexPattern);
      const nullPattern = prefixIndexPatternWithCcs(config, indexPattern, null);
      const blankPattern = prefixIndexPatternWithCcs(config, indexPattern, '');

      expect(undefinedPattern).to.be(indexPattern);
      expect(nullPattern).to.be(indexPattern);
      expect(blankPattern).to.be(indexPattern);
    });

    it('returns the ccs-prefixed index pattern', () => {
      // TODO apply as MonitoringConfig during typescript conversion
      const config = { ui: { css: { enabled: true } } };

      const abcPattern = prefixIndexPatternWithCcs(config, indexPattern, 'aBc');
      const underscorePattern = prefixIndexPatternWithCcs(config, indexPattern, 'cluster_one');

      expect(abcPattern).to.eql(
        'aBc:.monitoring-xyz-1-*,aBc:.monitoring-xyz-2-*,aBc:monitoring-xyz-1-*,aBc:monitoring-xyz-2-*'
      );
      expect(underscorePattern).to.eql(
        'cluster_one:.monitoring-xyz-1-*,cluster_one:.monitoring-xyz-2-*,cluster_one:monitoring-xyz-1-*,cluster_one:monitoring-xyz-2-*'
      );
    });

    it('returns the ccs-prefixed index pattern when wildcard and the local cluster pattern', () => {
      // TODO apply as MonitoringConfig during typescript conversion
      const config = { ui: { css: { enabled: true } } };

      const pattern = prefixIndexPatternWithCcs(config, indexPattern, '*');

      // it should have BOTH patterns so that it searches all CCS clusters and the local cluster
      expect(pattern).to.eql(
        '*:.monitoring-xyz-1-*,*:.monitoring-xyz-2-*,*:monitoring-xyz-1-*,*:monitoring-xyz-2-*' +
          ',' +
          indexPattern
      );
    });
  });

  describe('parseCrossClusterPrefix', () => {
    it('returns ccs prefix for index with one', () => {
      expect(parseCrossClusterPrefix('abc:.monitoring-es-6-2017.07.28')).to.eql('abc');
      expect(parseCrossClusterPrefix('abc:monitoring-es-6-2017.07.28')).to.eql('abc');
      expect(parseCrossClusterPrefix('abc_123:.monitoring-es-6-2017.07.28')).to.eql('abc_123');
      expect(parseCrossClusterPrefix('abc_123:monitoring-es-6-2017.07.28')).to.eql('abc_123');
      expect(parseCrossClusterPrefix('broken:example:.monitoring-es-6-2017.07.28')).to.eql(
        'broken'
      );
      expect(parseCrossClusterPrefix('broken:example:monitoring-es-6-2017.07.28')).to.eql('broken');
      expect(parseCrossClusterPrefix('with-a-dash:.monitoring-es-6-2017.07.28')).to.eql(
        'with-a-dash'
      );
      expect(parseCrossClusterPrefix('with-a-dash:monitoring-es-6-2017.07.28')).to.eql(
        'with-a-dash'
      );
      expect(parseCrossClusterPrefix('something:not-monitoring')).to.eql('something');
    });

    it('returns null when no prefix exists', () => {
      expect(parseCrossClusterPrefix('.monitoring-es-6-2017.07.28')).to.be(null);
      expect(parseCrossClusterPrefix('monitoring-es-6-2017.07.28')).to.be(null);
      expect(parseCrossClusterPrefix('random')).to.be(null);
    });
  });
});
