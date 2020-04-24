/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, SavedObjectsFindResponse } from 'src/core/server';
import {
  CaseConfigureServiceSetup,
  CaseServiceSetup,
  CaseUserActionServiceSetup,
} from '../../services';
import { CommentAttributes } from '../../../common/api/cases';

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

interface PatchConnector {
  connectorId: string | null;
  caseVersion: string;
}

export interface ExtraCaseData extends PatchConnector {
  caseId: string;
  totalComment: number;
}

export interface ExtraDataFindByCases
  extends SavedObjectsFindResponse<CommentAttributes>,
    PatchConnector {
  cId: string;
}
