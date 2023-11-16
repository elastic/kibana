/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleBackfillResults } from '../../../../../../../application/rule/methods/backfill/schedule/types';

export const transformResponse = (result: ScheduleBackfillResults) => {
  return result.map(({ ruleId, backfillId }) => ({ rule_id: ruleId, backfill_id: backfillId }));
};
