/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TASK_TYPE_PREFIX } from '../task_manager/usage_reporting_task';
import { MetringTaskProperties } from '../types';
import { cspmMetringCallback } from './cspm_metring_task';

const TASK_INTERVAL = 3600; // 1 hour

export const cspmMetringTaskProperties: MetringTaskProperties = {
  taskType: TASK_TYPE_PREFIX + ':cspm-usage-reporting-task',
  taskTitle: 'Security Solution - CSPM Metring Periodic Tasks',
  meteringCallback: cspmMetringCallback,
  interval: TASK_INTERVAL.toString() + 's',
  periodSeconds: TASK_INTERVAL,
  version: '1',
};
