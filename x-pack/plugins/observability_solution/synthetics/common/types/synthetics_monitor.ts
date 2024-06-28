/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MonitorFields,
  ServiceLocationErrors,
  SyntheticsMonitor,
  SyntheticsMonitorSchedule,
} from '../runtime_types';

export interface TestNowResponse {
  schedule: SyntheticsMonitorSchedule;
  locations: MonitorFields['locations'];
  errors?: ServiceLocationErrors;
  testRunId: string;
  configId: string;
  monitor: SyntheticsMonitor;
}

export interface AgentPolicyInfo {
  id: string;
  name: string;
  agents: number;
  status: string;
  description?: string;
  namespace?: string;
}
