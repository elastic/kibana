/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultDatasetsSummaryPanelContext } from './types';

export const DEFAULT_CONTEXT: DefaultDatasetsSummaryPanelContext = {
  datasetsQuality: {
    percentages: [],
  },
  datasetsActivity: {
    total: 0,
    active: 0,
  },
  estimatedData: {
    estimatedDataInBytes: 0,
  },
};
