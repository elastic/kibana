/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';

export type Alert = ParsedTechnicalFields & {
  _id: string;
  agent?: AlertAgent;
  process?: { pid: string };
};

export interface AlertAgent {
  id: string;
  name: string;
}

export interface AlertWithAgent extends Alert {
  agent: AlertAgent;
}

export interface ResponseActionAlerts {
  alerts: AlertWithAgent[];
}
