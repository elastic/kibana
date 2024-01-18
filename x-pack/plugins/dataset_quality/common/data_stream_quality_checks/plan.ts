/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { checkTimeRangeRT } from './common';

export const checkPlanStepRT = rt.strict({
  check_id: rt.string,
  data_stream: rt.string,
  time_range: checkTimeRangeRT,
});

export type CheckPlanStep = rt.TypeOf<typeof checkPlanStepRT>;

export const checkPlanRT = rt.strict({
  data_stream: rt.string,
  time_range: checkTimeRangeRT,
  checks: rt.array(checkPlanStepRT),
});

export type CheckPlan = rt.TypeOf<typeof checkPlanRT>;
