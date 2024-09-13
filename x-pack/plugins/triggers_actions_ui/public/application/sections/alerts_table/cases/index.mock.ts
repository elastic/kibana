/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components';
import { Case } from '../hooks/apis/bulk_get_cases';

export const theCase: Case = {
  id: 'test-id',
  created_at: '2023-02-16T18:13:37.058Z',
  created_by: { full_name: 'Elastic', username: 'elastic', email: 'elastic@elastic.co' },
  description: 'Test description',
  status: CaseStatuses.open,
  title: 'Test case',
  totalComment: 1,
  version: 'WzQ3LDFd',
  owner: 'cases',
};

export const getCasesMockMap = (): Map<string, Case> => {
  const casesMap = new Map();

  casesMap.set(theCase.id, theCase);
  casesMap.set('test-id-2', { ...theCase, id: 'test-id-2', title: 'Test case 2' });

  return casesMap;
};
