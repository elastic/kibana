/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import { getInventoryViewInAppUrl } from './alert_link';

describe('Inventory Threshold Rule', () => {
  describe('getInventoryViewInAppUrl', () => {
    it('should work with custom metrics', () => {
      const fields = {
        [TIMESTAMP]: '2022-01-01T00:00:00.000Z',
        [`${ALERT_RULE_PARAMETERS}.nodeType`]: 'host',
        [`${ALERT_RULE_PARAMETERS}.criteria.metric`]: ['custom'],
        [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.id`]: ['alert-custom-metric'],
        [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.aggregation`]: ['avg'],
        [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.field`]: ['system.cpu.user.pct'],
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getInventoryViewInAppUrl(fields);
      expect(url).toEqual(
        '/app/metrics/link-to/inventory?customMetric=%28aggregation%3Aavg%2Cfield%3Asystem.cpu.user.pct%2Cid%3Aalert-custom-metric%2Ctype%3Acustom%29&metric=%28aggregation%3Aavg%2Cfield%3Asystem.cpu.user.pct%2Cid%3Aalert-custom-metric%2Ctype%3Acustom%29&nodeType=h&timestamp=1640995200000'
      );
    });
    it('should work with non-custom metrics', () => {
      const fields = {
        [TIMESTAMP]: '2022-01-01T00:00:00.000Z',
        [`${ALERT_RULE_PARAMETERS}.nodeType`]: 'host',
        [`${ALERT_RULE_PARAMETERS}.criteria.metric`]: ['cpu'],
      } as unknown as ParsedTechnicalFields & Record<string, any>;
      const url = getInventoryViewInAppUrl(fields);
      expect(url).toEqual(
        '/app/metrics/link-to/inventory?customMetric=&metric=%28type%3Acpu%29&nodeType=h&timestamp=1640995200000'
      );
    });
  });
});
