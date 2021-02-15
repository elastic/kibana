/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AppRequestContext } from '../../security_solution/server/types';
import { CaseClient } from './client';

export interface CaseRequestContext {
  getCaseClient: () => CaseClient;
}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    case?: CaseRequestContext;
    // TODO: Remove when triggers_ui do not import case's types.
    // PR https://github.com/elastic/kibana/pull/84587.
    securitySolution?: AppRequestContext;
  }
}
