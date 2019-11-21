/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, IRouter } from 'src/core/server';
import { initGetAllCasesApi } from './get_all_cases';
import { initGetCaseApi } from './get_case';
import { initGetCommentApi } from './get_comment';
import { initPostCaseApi } from './post_case';
import { initPostCommentApi } from './post_comment';
import { initUpdateCaseApi } from './update_case';
import { initUpdateCommentApi } from './update_comment';
import { PluginSetupContract as SecurityPluginSetup } from '../../../../security/server';

export interface RouteDeps {
  authentication: SecurityPluginSetup['authc'] | null;
  caseIndex: string;
  log: Logger;
  router: IRouter;
}

export function initCaseApi(deps: RouteDeps) {
  initGetAllCasesApi(deps);
  initGetCaseApi(deps);
  initGetCommentApi(deps);
  initPostCaseApi(deps);
  initPostCommentApi(deps);
  initUpdateCaseApi(deps);
  initUpdateCommentApi(deps);
}
