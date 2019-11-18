/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, IRouter, CoreSetup } from 'src/core/server';
import { initGetCaseApi } from './get_case';
import { initPostCaseApi } from './post_case';

export interface RouteDeps {
  caseIndex: string;
  http: CoreSetup['http'];
  log: Logger;
  router: IRouter;
}

export function initCaseApi(deps: RouteDeps) {
  initGetCaseApi(deps);
  initPostCaseApi(deps);
}
