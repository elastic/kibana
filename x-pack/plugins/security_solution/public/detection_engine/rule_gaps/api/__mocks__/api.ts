/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scheduleRuleRunMock } from '../../logic/__mocks__/mock';

import type { ScheduleRuleRunProps, ScheduleRuleRunResponse } from '../../logic/types';

export const scheduleRuleRun = async ({
  ruleIds,
  timeRange,
}: ScheduleRuleRunProps): Promise<ScheduleRuleRunResponse> => Promise.resolve(scheduleRuleRunMock);
