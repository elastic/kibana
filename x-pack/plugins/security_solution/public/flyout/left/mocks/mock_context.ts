/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RISK_SCORE, ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { LeftPanelContext } from '../context';

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
    case '@timestamp':
      return ['2022-07-25T08:20:18.966Z'];
    default:
      return [];
  }
};

/**
 * Mock contextValue for left panel context
 */
export const mockContextValue: LeftPanelContext = {
  eventId: 'eventId',
  indexName: 'index',
  scopeId: 'scopeId',
  browserFields: null,
  dataFormattedForFieldBrowser: null,
  getFieldsData: mockGetFieldsData,
  searchHit: {
    _id: 'testId',
    _index: 'testIndex',
  },
  dataAsNestedObject: {
    _id: 'testId',
  },
  investigationFields: [],
};
