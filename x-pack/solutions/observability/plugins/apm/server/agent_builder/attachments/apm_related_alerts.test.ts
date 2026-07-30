/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmRelatedAlertsAttachmentType } from './apm_related_alerts';

const type = createApmRelatedAlertsAttachmentType();

const validAlert = {
  id: 'alert-uuid-1',
  ruleName: 'High error rate',
  ruleTypeId: 'apm.transaction_error_rate',
  status: 'active' as const,
  reason: 'Error rate 22% > 10%',
  serviceName: 'checkout',
  start: 1_700_000_000_000,
  duration: 300_000,
  severity: 'critical',
};

describe('createApmRelatedAlertsAttachmentType', () => {
  it('has the correct id', () => {
    expect(type.id).toBe('observability.apm-related-alerts');
  });

  describe('validate', () => {
    it('accepts valid data with all alert fields', () => {
      const result = type.validate({
        serviceName: 'checkout',
        environment: 'production',
        title: 'Related Alerts — checkout',
        alerts: [validAlert],
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.serviceName).toBe('checkout');
        expect(result.data.alerts).toHaveLength(1);
      }
    });

    it('accepts minimal valid data (no alerts, no optional fields)', () => {
      const result = type.validate({ serviceName: 'checkout', alerts: [] });
      expect(result.valid).toBe(true);
    });

    it('accepts alerts with only required fields (no reason, duration, severity, serviceName)', () => {
      const result = type.validate({
        serviceName: 'checkout',
        alerts: [
          {
            id: 'a1',
            ruleName: 'Latency rule',
            ruleTypeId: 'apm.transaction_duration',
            status: 'recovered' as const,
            start: 1_700_000_000_000,
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing serviceName', () => {
      const result = type.validate({ alerts: [] });
      expect(result.valid).toBe(false);
    });

    it('rejects missing alerts array', () => {
      const result = type.validate({ serviceName: 'checkout' });
      expect(result.valid).toBe(false);
    });

    it('rejects an alert with invalid status value', () => {
      const result = type.validate({
        serviceName: 'checkout',
        alerts: [{ ...validAlert, status: 'unknown' }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects an alert missing required id field', () => {
      const { id: _id, ...noId } = validAlert;
      const result = type.validate({ serviceName: 'checkout', alerts: [noId] });
      expect(result.valid).toBe(false);
    });

    it('rejects an alert with a non-number start', () => {
      const result = type.validate({
        serviceName: 'checkout',
        alerts: [{ ...validAlert, start: 'not-a-number' }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects a serviceName that exceeds the max length', () => {
      const result = type.validate({
        serviceName: 'x'.repeat(1025),
        alerts: [],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('getAgentDescription', () => {
    it('returns a non-empty description string', () => {
      const description = type.getAgentDescription?.();
      expect(typeof description).toBe('string');
      expect((description ?? '').length).toBeGreaterThan(10);
    });
  });
});
