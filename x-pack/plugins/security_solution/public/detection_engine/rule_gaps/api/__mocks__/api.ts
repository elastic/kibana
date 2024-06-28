/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleBackfillResponseBody } from '@kbn/alerting-plugin/common/routes/backfill/apis/schedule';
import { scheduleRuleRunMock } from '../../logic/__mocks__/mock';

import type { ScheduleBackfillProps } from '../../types';

export const scheduleRuleRun = async ({
  ruleIds,
  timeRange,
}: ScheduleBackfillProps): Promise<ScheduleBackfillResponseBody> =>
  Promise.resolve(scheduleRuleRunMock);
