/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimpleSavedObject } from 'kibana/public';
import { EncryptedSyntheticsMonitor, SyntheticsMonitor } from '../runtime_types';

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
}
