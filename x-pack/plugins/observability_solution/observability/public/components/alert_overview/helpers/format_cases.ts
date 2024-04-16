/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseTooltipContentProps } from '@kbn/cases-components';
import { Case } from '@kbn/cases-plugin/common';

export const formatCase = (theCase: Case): CaseTooltipContentProps => ({
  title: theCase.title,
  description: theCase.description,
  createdAt: theCase.created_at,
  createdBy: {
    username: theCase.created_by.username ?? undefined,
    fullName: theCase.created_by.full_name ?? undefined,
  },
  status: theCase.status,
  totalComments: theCase.totalComment,
});
