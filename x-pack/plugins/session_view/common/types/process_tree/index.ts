/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EventKind {
  event = 'event',
  signal = 'signal',
}

export enum EventAction {
  fork = 'fork',
  exec = 'exec',
  exit = 'exit',
  output = 'output',
}

export interface EventActionPartition {
  fork: ProcessEvent[];
  exec: ProcessEvent[];
  exit: ProcessEvent[];
  output: ProcessEvent[];
}

export interface User {
  id: string;
  name: string;
}

export interface ProcessEventResults {
  events: any[];
}

export interface ProcessFields {
  args: string[];
  args_count: number;
  entity_id: string;
  executable: string;
  interactive: boolean;
  name: string;
  working_directory: string;
  pid: number;
  pgid: number;
  user: User;
  start: Date;
  end?: Date;
  exit_code?: number;
}

export interface ProcessSelf extends ProcessFields {
  parent: ProcessFields;
  session: ProcessFields;
  entry: ProcessFields;
  last_user_entered?: ProcessFields;
}

export interface ProcessEventHost {
  architecture: string;
  hostname: string;
  id: string;
  ip: string;
  mac: string;
  name: string;
  os: {
    family: string;
    full: string;
    kernel: string;
    name: string;
    platform: string;
    type: string;
    version: string;
  };
}

export interface ProcessEventAlertRule {
  category: string;
  consumer: string;
  description: string;
  enabled: boolean;
  name: string;
  query: string;
  risk_score: number;
  severity: string;
  uuid: string;
}

export interface ProcessEventAlert {
  uuid: string;
  reason: string;
  workflow_status: string;
  status: string;
  original_time: Date;
  original_event: {
    action: string;
  };
  rule: ProcessEventAlertRule;
}

export interface ProcessEvent {
  '@timestamp': Date;
  event: {
    kind: EventKind;
    category: string;
    action: EventAction;
  };
  // optional host for now (raw agent output doesn't have server identity)
  host?: ProcessEventHost;
  process: ProcessSelf;
  kibana?: {
    alert: ProcessEventAlert;
  };
}

export interface ProcessEventsPage {
  events: ProcessEvent[],
  cursor: string,
}

export interface Process {
  id: string; // the process entity_id
  events: ProcessEvent[];
  children: Process[];
  parent: Process | undefined;
  autoExpand: boolean;
  searchMatched: string | null; // either false, or set to searchQuery
  hasOutput(): boolean;
  hasAlerts(): boolean;
  getAlerts(): ProcessEvent[];
  hasExec(): boolean;
  getOutput(): string;
  getDetails(): ProcessEvent;
  isUserEntered(): boolean;
  getMaxAlertLevel(): number | null;
}

export type ProcessMap = {
  [key: string]: Process;
};
