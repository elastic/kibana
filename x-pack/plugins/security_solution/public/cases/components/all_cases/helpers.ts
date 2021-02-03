/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { filter } from 'lodash/fp';
import { CaseStatuses } from '../../../../../case/common/api';
import { Case } from '../../containers/types';
import { statuses } from '../status';

export const getSubCasesStatusCountsBadges = (
  subCases: Case[]
): Array<{ name: CaseStatuses; color: string; count: number }> => {
  return [
    {
      name: CaseStatuses.open,
      color: statuses[CaseStatuses.open].color,
      count: filter({ status: CaseStatuses.open }, subCases).length,
    },
    {
      name: CaseStatuses['in-progress'],
      color: statuses[CaseStatuses['in-progress']].color,
      count: filter({ status: CaseStatuses['in-progress'] }, subCases).length,
    },
    {
      name: CaseStatuses.closed,
      color: statuses[CaseStatuses.closed].color,
      count: filter({ status: CaseStatuses.closed }, subCases).length,
    },
  ];
};
