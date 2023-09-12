/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_SEVERITY,
  ALERT_SUPPRESSION_DOCS_COUNT,
} from '@kbn/rule-data-utils';

/**
 * Returns mocked data for field (mock this method: x-pack/plugins/security_solution/public/common/hooks/use_get_fields_data.ts)
 * @param field
 * @returns string[]
 */
export const mockGetFieldsData = (field: string): string[] => {
  switch (field) {
    case ALERT_SEVERITY:
      return ['low'];
    case ALERT_RISK_SCORE:
      return ['0'];
    case 'host.name':
      return ['host1'];
    case 'user.name':
      return ['user1'];
    case ALERT_REASON:
      return ['reason'];
    case ALERT_SUPPRESSION_DOCS_COUNT:
      return ['1'];
    case '@timestamp':
      return ['2023-01-01T00:00:00.000Z'];
    default:
      return [];
  }
};
