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
  text_output = 'text_output',
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
  rows?: number;
  columns?: number;
}

export interface IOLine {
  event: ProcessEvent;
  value: string;
}

export interface ProcessStartMarker {
  event: ProcessEvent;
  line: number;
}

export interface IOFields {
  text?: string;
  max_bytes_per_process_exceeded?: boolean;
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
  real_user?: User;
  real_group?: Group;
  saved_user?: User;
  saved_group?: Group;
  supplemental_groups?: Group[];
  exit_code?: number;
  entry_meta?: EntryMeta;
  tty?: Teletype;
}

export interface ProcessSelf extends ProcessFields {
  parent?: ProcessFields;
  session_leader?: ProcessFields;
  entry_leader?: ProcessFields;
  group_leader?: ProcessFields;
  io?: IOFields;
}

export interface ProcessEventHost {
  architecture?: string;
  hostname?: string;
  id?: string;
  ip?: string[];
  mac?: string[];
  name?: string;
  os?: {
    family?: string;
    full?: string;
    kernel?: string;
    name?: string;
    platform?: string;
    version?: string;
  };
  boot?: {
    id?: string;
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
    id?: string;
  };
  user?: User;
  group?: Group;
  host?: ProcessEventHost;
  process?: ProcessSelf;
  kibana?: {
    alert?: ProcessEventAlert;
  };
  container?: ProcessEventContainer;
  orchestrator?: ProcessEventOrchestrator;
  cloud?: ProcessEventCloud;
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
  searchMatched: number[] | null; // either false, or set to searchQuery
  addEvent(event: ProcessEvent): void;
  addAlert(alert: ProcessEvent): void;
  addChild(child: Process): void;
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
  isVerbose(): boolean;
  getEndTime(): string;
  isDescendantOf(process: Process): boolean;
}

export type ProcessMap = {
  [key: string]: Process;
};

export interface ProcessEventContainer {
  id?: string;
  name?: string;
  image?: {
    name?: string;
    tag?: string;
    hash?: {
      all?: string;
    };
  };
}

export interface ProcessEventOrchestrator {
  resource?: {
    name?: string;
    type?: string;
    ip?: string;
    parent?: {
      type?: string;
    };
  };
  namespace?: string;
  cluster?: {
    name?: string;
    id?: string;
  };
}

export interface ProcessEventCloud {
  instance?: {
    name?: string;
  };
  account?: {
    id?: string;
  };
  project?: {
    id?: string;
  };
  provider?: string;
  region?: string;
}
