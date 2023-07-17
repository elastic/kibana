/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TASK_TYPE_PREFIX } from './usage_reporting_task';
import { MeteringCallbackInput, MetringTaskProperties, UsageRecord } from '../types';

export const cspmMetringCallback = ({
  esClient,
  logger,
  lastSuccessfulReport,
}: MeteringCallbackInput): UsageRecord[] => {
  try {
    console.log('cspm metring task');
    const hourTs = new Date();
    hourTs.setMinutes(0);
    hourTs.setSeconds(0);
    hourTs.setMilliseconds(0);
    const record: UsageRecord = {
      id: `cloud-security-posture-${hourTs}`,
      usage_timestamp: 'hourTs',
      creation_timestamp: 'hourTs',
      usage: {
        type: 'security_solution_endpoint',
        sub_type: 'complete',
        period_seconds: 5,
        quantity: 1,
      },
      source: {
        id: 'endpoint-id-123',
        instance_group_id: 'id-123',
        instance_group_type: 'serverless_project',
      },
    };
    logger.debug(`${hourTs} Fetched CSPM metring data: ${record}`);
    return [record];
  } catch (err) {
    const hourTs = new Date();
    logger.error(`${hourTs} Failed to fetch CSPM metering data`);
    return [];
  }
};

export const cspmMetringTaskProperties: MetringTaskProperties = {
  taskType: TASK_TYPE_PREFIX + ':cspm-usage-reporting-task',
  taskTitle: 'Security Solution - CSPM Metring Periodic Tasks',
  meteringCallback: cspmMetringCallback,
  interval: '5m',
  version: '1',
};
