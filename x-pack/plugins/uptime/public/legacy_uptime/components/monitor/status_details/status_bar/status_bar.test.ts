/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderMonitorType } from './status_bar';

describe('StatusBar component', () => {
  describe('renderMonitorType', () => {
    it('handles http type', () => {
      expect(renderMonitorType('http')).toBe('HTTP');
    });

    it('handles tcp type', () => {
      expect(renderMonitorType('tcp')).toBe('TCP');
    });

    it('handles icmp type', () => {
      expect(renderMonitorType('icmp')).toBe('ICMP');
    });

    it('handles browser type', () => {
      expect(renderMonitorType('browser')).toBe('Browser');
    });

    it('returns empty string for `undefined`', () => {
      expect(renderMonitorType(undefined)).toBe('');
    });
  });
});
