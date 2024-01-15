/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultAiOpsListState, type AiOpsFullIndexBasedAppState } from './common';

export interface LogCategorizationPageUrlState {
  pageKey: 'logCategorization';
  pageUrlState: LogCategorizationAppState;
}

export interface LogCategorizationAppState extends AiOpsFullIndexBasedAppState {
  field: string | undefined;
}

export const getDefaultLogCategorizationAppState = (
  overrides?: Partial<LogCategorizationAppState>
): LogCategorizationAppState => {
  return {
    field: undefined,
    ...getDefaultAiOpsListState(overrides),
  };
};
