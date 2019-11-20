/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, IRouter } from 'src/core/server';
import { initGetAllApi } from './get_all';
import { initGetCaseApi } from './get_case';
import { initPostCaseApi } from './post_case';
import { initUpdateCaseApi } from './update_case';

export interface RouteDeps {
  caseIndex: string;
  log: Logger;
  router: IRouter;
}

export function initCaseApi(deps: RouteDeps) {
  initGetAllApi(deps);
  initGetCaseApi(deps);
  initPostCaseApi(deps);
  initUpdateCaseApi(deps);
}
