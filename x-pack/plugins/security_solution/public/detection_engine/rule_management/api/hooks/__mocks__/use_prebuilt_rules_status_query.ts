/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrePackagedRulesStatusResponse } from '../../../logic';
import { mockReactQueryResponse } from './mock_react_query_response';

export const usePrebuiltRulesStatusQuery = jest.fn(() =>
  mockReactQueryResponse<PrePackagedRulesStatusResponse>({
    data: {
      rules_custom_installed: 0,
      rules_installed: 0,
      rules_not_installed: 0,
      rules_not_updated: 0,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    },
  })
);
