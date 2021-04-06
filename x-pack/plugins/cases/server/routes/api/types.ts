/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'kibana/server';

import type {
  CaseConfigureService,
  CaseService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
} from '../../services';

import type { CasesRouter } from '../../types';

export interface RouteDeps {
  caseConfigureService: CaseConfigureService;
  caseService: CaseService;
  connectorMappingsService: ConnectorMappingsService;
  router: CasesRouter;
  userActionService: CaseUserActionService;
  attachmentService: AttachmentService;
  logger: Logger;
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
