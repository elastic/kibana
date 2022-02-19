/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteCaseRoute } from './cases/delete_cases';
import { CaseRoute } from './types';

export const getExternalRoutes = () =>
  [
    deleteCaseRoute,
    // findCaseRoute,
    // getCaseRoute,
    // resolveCaseRoute,
    // patchCaseRoute,
    // postCaseRoute,
    // pushCaseRoute,
    // getUserActionsRoute,
    // getStatusRoute,
    // getCasesByAlertIdRoute,
    // getReportersRoute,
  ] as CaseRoute[];
