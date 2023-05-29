/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';

export interface AlertAgent {
  id: string;
  name: string;
}

export type ResponseActionsAlerts = Record<
  string, // agentId
  {
    agent: {
      id: string;
      name: string;
    };
    alert: AlertWithAgent;
    pids?: Record<
      string,
      {
        alertIds: string[];
        agentId: string;
        hosts: Record<string, { name: string }>;
        parameters: Record<string, unknown>;
      }
    >;
    alertIds: string[];
    hosts: Record<string, { name: string }>;
  }
>;

export type Alert = ParsedTechnicalFields & {
  _id: string;
  agent?: AlertAgent;
  process?: { pid: string };
};

export interface AlertWithAgent extends Alert {
  agent: AlertAgent;
}

export interface ResponseActionAlerts {
  alerts: AlertWithAgent[];
}

export interface OsqueryResponseActionAlert extends ResponseActionAlerts {
  agentIds: string[];
  alertIds: string[];
}
