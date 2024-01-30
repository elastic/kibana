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

const mockFieldData: Record<string, string[]> = {
  [ALERT_SEVERITY]: ['low'],
  [ALERT_RISK_SCORE]: ['0'],
  'host.name': ['host1'],
  'user.name': ['user1'],
  [ALERT_REASON]: ['reason'],
  [ALERT_SUPPRESSION_DOCS_COUNT]: ['1'],
  '@timestamp': ['2023-01-01T00:00:00.000Z'],
};

/**
 * Returns mocked data for field (mock this method: x-pack/plugins/security_solution/public/common/hooks/use_get_fields_data.ts)
 * @param field
 * @returns string[]
 */
export const mockGetFieldsData = (field: string): string[] => mockFieldData[field] ?? [];
