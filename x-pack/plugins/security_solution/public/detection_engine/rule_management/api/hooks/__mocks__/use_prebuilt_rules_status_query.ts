/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRulesStatusResponse } from '../use_prebuilt_rules_status_query';
import { mockReactQueryResponse } from './mock_react_query_response';

export const usePrebuiltRulesStatusQuery = jest.fn(() =>
  mockReactQueryResponse<PrebuiltRulesStatusResponse>({
    data: {
      rulesCustomInstalled: 0,
      rulesInstalled: 0,
      rulesNotInstalled: 0,
      rulesNotUpdated: 0,
      timelinesInstalled: 0,
      timelinesNotInstalled: 0,
      timelinesNotUpdated: 0,
    },
  })
);
