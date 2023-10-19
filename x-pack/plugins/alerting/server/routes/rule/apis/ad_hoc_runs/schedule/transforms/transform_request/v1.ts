/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RewriteRequestCase } from '@kbn/actions-plugin/common';
import { ScheduleAdHocRuleRunOptions } from '../../../../../../../application/rule/methods/ad_hoc_runs/schedule/types';

export const transformRequest: RewriteRequestCase<ScheduleAdHocRuleRunOptions> = ({
  rule_ids: ruleIds,
  interval_start: intervalStart,
  interval_duration: intervalDuration,
  interval_end: intervalEnd,
}) => ({
  ruleIds,
  intervalStart,
  intervalDuration,
  ...(intervalEnd ? { intervalEnd } : {}),
});
