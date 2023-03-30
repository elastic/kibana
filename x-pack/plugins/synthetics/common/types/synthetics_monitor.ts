/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SimpleSavedObject } from '@kbn/core/public';
import {
  EncryptedSyntheticsMonitor,
  Locations,
  MonitorFields,
  ServiceLocationErrors,
  SyntheticsMonitor,
  SyntheticsMonitorSchedule,
} from '../runtime_types';

export interface MonitorIdParam {
  monitorId: string;
}

export type SyntheticsMonitorSavedObject = SimpleSavedObject<EncryptedSyntheticsMonitor> & {
  updated_at: string;
};

export type DecryptedSyntheticsMonitorSavedObject = SimpleSavedObject<SyntheticsMonitor> & {
  updated_at: string;
};

export interface SyntheticsServiceAllowed {
  serviceAllowed: boolean;
  signupUrl: string;
}

export interface TestNowResponse {
  schedule: SyntheticsMonitorSchedule;
  locations: Locations;
  errors?: ServiceLocationErrors;
  testRunId: string;
  configId: string;
  monitor: MonitorFields;
}
