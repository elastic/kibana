/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MonitorSummaryStatusRule {
  reason: string;
  status: string;
  configId: string;
  hostName: string;
  monitorId: string;
  checkedAt: string;
  monitorUrl: string;
  locationId: string;
  monitorType: string;
  monitorName: string;
  locationName: string;
  lastErrorMessage: string;
  stateId: string | null;
  monitorUrlLabel: string;
  monitorTags?: string[];
}
