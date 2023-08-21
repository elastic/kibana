/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudSecurityMetringCallback } from './cloud_security_metering';
import type { MetringTaskProperties } from '../types';

const TASK_INTERVAL = 1800; // 30 minutes

export const cloudSecurityMetringTaskProperties: MetringTaskProperties = {
  taskType: 'cloud-security-usage-reporting-task',
  taskTitle: 'Cloud Security Metring Periodic Tasks',
  meteringCallback: cloudSecurityMetringCallback,
  interval: `${TASK_INTERVAL.toString()}s`,
  periodSeconds: TASK_INTERVAL,
  version: '1',
};
