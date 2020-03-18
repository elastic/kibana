/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { CaseConfigureServiceSetup, CaseServiceSetup } from '../../services';

export interface RouteDeps {
  caseConfigureService: CaseConfigureServiceSetup;
  caseService: CaseServiceSetup;
  router: IRouter;
}

export enum SortFieldCase {
  createdAt = 'created_at',
  status = 'status',
  updatedAt = 'updated_at',
}
