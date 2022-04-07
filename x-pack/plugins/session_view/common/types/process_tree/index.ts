/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertStatusEventEntityIdMap {
  [alertUuid: string]: {
    status: string;
    processEntityId: string;
  };
}

export const enum EventKind {
  event = 'event',
  signal = 'signal',
}

export const enum EventAction {
  fork = 'fork',
  exec = 'exec',
  end = 'end',
  output = 'output',
}

export interface User {
  id?: string;
  name?: string;
}

export interface Group {
  id?: string;
  name?: string;
}

export interface ProcessEventResults {
  total?: number;
  events?: any[];
}

export type EntryMetaType =
  | 'init'
  | 'sshd'
  | 'ssm'
  | 'kubelet'
  | 'teleport'
  | 'terminal'
  | 'console';

export interface EntryMeta {
  type?: EntryMetaType;
  source?: {
    ip?: string;
  };
}

export interface Teletype {
  char_device?: {
    major?: number;
    minor?: number;
  };
}

export interface ProcessFields {
  entity_id?: string;
  args?: string[];
  args_count?: number;
  command_line?: string;
  executable?: string;
  name?: string;
  interactive?: boolean;
  working_directory?: string;
  pid?: number;
  start?: string;
  end?: string;
  user?: User;
  group?: Group;
  exit_code?: number;
  entry_meta?: EntryMeta;
  tty?: Teletype;
}

export interface ProcessSelf extends ProcessFields {
  parent?: ProcessFields;
  session_leader?: ProcessFields;
  entry_leader?: ProcessFields;
  group_leader?: ProcessFields;
}

export interface ProcessEventHost {
  architecture?: string;
  hostname?: string;
  id?: string;
  ip?: string;
  mac?: string;
  name?: string;
  os?: {
    family?: string;
    full?: string;
    kernel?: string;
    name?: string;
    platform?: string;
    version?: string;
  };
}

export interface ProcessEventAlertRule {
  category?: string;
  consumer?: string;
  description?: string;
  enabled?: boolean;
  name?: string;
  query?: string;
  risk_score?: number;
  severity?: string;
  uuid?: string;
}

export interface ProcessEventAlert {
  uuid?: string;
  reason?: string;
  workflow_status?: string;
  status?: string;
  original_time?: string;
  original_event?: {
    action?: string;
  };
  rule?: ProcessEventAlertRule;
}

export interface ProcessEvent {
  '@timestamp'?: string;
  event?: {
    kind?: EventKind;
    category?: string;
    action?: EventAction;
  };
  user?: User;
  group?: Group;
  host?: ProcessEventHost;
  process?: ProcessSelf;
  kibana?: {
    alert?: ProcessEventAlert;
  };
}

export interface ProcessEventsPage {
  events?: ProcessEvent[];
  cursor?: string;
  total?: number; // total count of all items across all pages (as reported by ES client)
}

export interface Process {
  id: string; // the process entity_id
  events: ProcessEvent[];
  alerts: ProcessEvent[];
  children: Process[];
  orphans: Process[]; // currently, orphans are rendered inline with the entry session leaders children
  parent: Process | undefined;
  autoExpand: boolean;
  searchMatched: string | null; // either false, or set to searchQuery
  addEvent(event: ProcessEvent): void;
  addAlert(alert: ProcessEvent): void;
  clearSearch(): void;
  hasOutput(): boolean;
  hasAlerts(): boolean;
  getAlerts(): ProcessEvent[];
  updateAlertsStatus(updatedAlertsStatus: AlertStatusEventEntityIdMap): void;
  hasExec(): boolean;
  getOutput(): string;
  getDetails(): ProcessEvent;
  isUserEntered(): boolean;
  getMaxAlertLevel(): number | null;
  getChildren(verboseMode: boolean): Process[];
}

export type ProcessMap = {
  [key: string]: Process;
};
