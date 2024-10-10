/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type {
  GetClusterHealthRequest,
  GetClusterHealthRequestBody,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { DEFAULT_TOP_N_RULES_LIMIT } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { validateHealthInterval } from '../health_interval';

export const validateGetClusterHealthRequest = (
  body: GetClusterHealthRequestBody
): GetClusterHealthRequest => {
  const now = moment();
  const interval = validateHealthInterval(body.interval, now);

  return {
    interval,
    num_of_top_rules: body.num_of_top_rules ?? DEFAULT_TOP_N_RULES_LIMIT,
    debug: body.debug ?? false,
    requestReceivedAt: now.utc().toISOString(),
  };
};
