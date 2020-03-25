/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
} from '../../services';

export interface RouteDeps {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  router: IRouter;
}

export enum SortFieldCase {
  closedAt = 'closed_at',
  createdAt = 'created_at',
  status = 'status',
}

export interface TotalCommentByCase {
  caseId: string;
  totalComments: number;
}
