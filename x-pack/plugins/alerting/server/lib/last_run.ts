/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleLastRun } from '../types';

export const getDefaultLastRun = (): RuleLastRun => ({
  warning: null,
  outcome: 'unknown',
  outcomeMsg: null,
  alertsCount: {
    active: null,
    new: null,
    recovered: null,
    ignored: null,
  },
});
