/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { formatNumber, formatBytesUsage } from './format_number';

describe('format_number', () => {
  describe('formatBytesUsage', () => {
    it('should 0 format bytes without a decimal', () => {
      expect(formatBytesUsage(0, 1024)).to.be('0.0 B / 1.0 KB');
      expect(formatBytesUsage(0, 1024 * 1024)).to.be('0.0 B / 1.0 MB');
    });

    it('shows a single decimal place', () => {
      // 604 KB + 114 B = 604.1 KB
      expect(formatBytesUsage(604 * 1024 + 114, 1024 * 1024)).to.be('604.1 KB / 1.0 MB');
      // 1.4 GB (aka roughly the standard Kibana heap)
      expect(formatBytesUsage(604 * 1024 * 1024 + 114 * 1024, 1.4 * 1024 * 1024 * 1024)).to.be(
        '604.1 MB / 1.4 GB'
      );
    });
  });

  describe('formatNumber', () => {
    it('should format time since', () => {
      expect(formatNumber(3000, 'time_since')).to.be('a few seconds');
      expect(formatNumber(300000, 'time_since')).to.be('5 minutes');
    });

    it('should format time in H:mm:ss', () => {
      expect(formatNumber(1461868937000, 'time')).to.match(/\d\d:\d\d:\d\d/);
    });

    it('should format integers with commas', () => {
      expect(formatNumber(3000, 'int_commas')).to.be('3,000');
      expect(formatNumber(4321.1)).to.be('4,321.1');
    });

    it('should format bytes', () => {
      expect(formatNumber(800000, 'byte')).to.be('781.3 KB');
    });

    it('should format ms', () => {
      expect(formatNumber(3000, 'ms')).to.be('3,000.0ms');
    });

    it('should not format strings', () => {
      expect(formatNumber('N/A', 'ms')).to.be('N/A');
    });

    it('should not format undefined', () => {
      expect(formatNumber(undefined, 'ms')).to.be('0ms');
    });

    it('should format NaN as 0', () => {
      expect(formatNumber(Number.NaN, 'ms')).to.be('0ms');
    });
  });
});
