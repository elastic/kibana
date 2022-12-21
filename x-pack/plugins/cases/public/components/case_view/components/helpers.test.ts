/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertComment } from '../../../containers/mock';
import { getManualAlertIds, getRegistrationContextFromAlerts } from './helpers';

const comment = {
  ...alertComment,
  alertId: 'alert-id-1',
  index: '.alerts-matchme.alerts',
};
const comment2 = {
  ...alertComment,
  alertId: 'alert-id-2',
  index: '.alerts-another.alerts',
};

const comment3 = {
  ...alertComment,
  alertId: ['nested1', 'nested2', 'nested3'],
};

const commentSiemSignal = {
  ...alertComment,
  alertId: 'alert-id-siem',
  index: '.siem-signals-default-000008',
};

const commentIsBad = {
  ...alertComment,
  alertId: 'alert-id-bad',
  index: 'bad-siem-signals-default-000008',
};

const multipleIndices = {
  ...alertComment,
  alertId: ['test-id-1', 'test-id-2', 'test-id-3', 'test-id-4', 'test-id-5', 'test-id-6'],
  index: [
    '.internal.alerts-security.alerts-default-000001',
    '.internal.alerts-observability.logs.alerts-default-000001',
    '.internal.alerts-observability.uptime.alerts-default-000001',
    '.internal.alerts-observability.metrics.alerts-default-000001',
    '.internal.alerts-observability.apm.alerts-space2-000001',
    '.internal.alerts-observability.logs.alerts-space1-000001',
  ],
};

describe('Case view helpers', () => {
  describe('getRegistrationContextFromAlerts', () => {
    it('returns the correct registration context', () => {
      const result = getRegistrationContextFromAlerts([comment, comment2, multipleIndices]);
      expect(result).toEqual([
        'matchme',
        'another',
        'security',
        'observability.logs',
        'observability.uptime',
        'observability.metrics',
        'observability.apm',
      ]);
    });

    it('dedupes contexts', () => {
      const result = getRegistrationContextFromAlerts([comment, comment]);
      expect(result).toEqual(['matchme']);
    });

    it('returns the correct registration when find a .siem-signals* index', () => {
      const result = getRegistrationContextFromAlerts([commentSiemSignal, comment2]);
      expect(result).toEqual(['security', 'another']);
    });

    it('returns empty when the index is not formatted as expected', () => {
      const result = getRegistrationContextFromAlerts([commentIsBad]);
      expect(result).toEqual([]);
    });
  });

  describe('getManualAlertIds', () => {
    it('returns the alert ids', () => {
      const result = getManualAlertIds([comment, comment2]);
      expect(result).toEqual(['alert-id-1', 'alert-id-2']);
    });

    it('returns the alerts id from multiple alerts in a comment', () => {
      const result = getManualAlertIds([comment, comment2, comment3]);
      expect(result).toEqual(['alert-id-1', 'alert-id-2', 'nested1', 'nested2', 'nested3']);
    });
  });
});
