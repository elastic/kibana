/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';

export type Alert = ParsedTechnicalFields &
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, any> & {
    _id: string;
    agent?: AlertAgent;
    process?: {
      pid: string;
      parent: {
        pid: string;
      };
    };
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

export interface AlertsFoundFields {
  alertIds: string[];
  agentId: string;
  hosts: Record<string, { name: string }>;
  parameters: Record<string, unknown>;
  error?: string;
}

export type EndpointResponseActionAlerts = Record<
  string, // agentId
  {
    agent: {
      id: string;
      name: string;
    };
    alert: AlertWithAgent;
    foundFields?: Record<string, AlertsFoundFields>;
    notFoundFields?: Record<string, AlertsFoundFields>;
    alertIds: string[];
    hosts: Record<string, { name: string }>;
  }
>;
