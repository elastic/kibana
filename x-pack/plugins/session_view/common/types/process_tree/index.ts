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

interface EventActionPartition {
  fork: ProcessEvent[];
  exec: ProcessEvent[];
  exit: ProcessEvent[];
  output: ProcessEvent[];
}

interface User {
  id: string;
  name: string;
}

interface ProcessFields {
  args: string[];
  args_count: number;
  command_line: string;
  entity_id: string;
  executable: string;
  interactive: boolean;
  name: string;
  working_directory: string;
  pid: number;
  pgid: number;
  user: User;
  end?: string;
  exit_code?: number;
}

export interface ProcessSelf extends ProcessFields {
  parent: ProcessFields;
  session: ProcessFields;
  entry: ProcessFields;
  last_user_entered?: ProcessFields;
}

export interface ProcessEvent {
  '@timestamp': Date;
  event: {
    kind: EventKind;
    category: string;
    action: EventAction;
  };
  host?: {
    // optional for now (raw agent output doesn't have server identity)
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
  };
  process: ProcessSelf;
  kibana?: {
    alert: {
      uuid: string;
      reason: string;
      workflow_status: string;
      status: string;
      original_time: Date;
      original_event: {
        action: string;
      };
      rule: {
        category: string;
        consumer: string;
        description: string;
        enabled: boolean;
        name: string;
        query: string;
        risk_score: number;
        severity: string;
        uuid: string;
      };
    };
  };
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

export class ProcessImpl implements Process {
  id: string;
  events: ProcessEvent[];
  children: Process[];
  parent: Process | undefined;
  autoExpand: boolean;
  searchMatched: string | null;

  constructor(id: string) {
    this.id = id;
    this.events = [];
    this.children = [];
    this.autoExpand = false;
    this.searchMatched = null;
  }

  hasOutput() {
    // TODO: schema undecided
    return !!this.events.find(({ event }) => event.action === EventAction.output);
  }

  hasAlerts() {
    return !!this.events.find(({ event }) => event.kind === EventKind.signal);
  }

  getAlerts() {
    return this.events.filter(({ event }) => event.kind === EventKind.signal);
  }

  hasExec() {
    return !!this.events.find(({ event }) => event.action === EventAction.exec);
  }

  hasExited() {
    return !!this.events.find(({ event }) => event.action === EventAction.exit);
  }

  getDetails() {
    const eventsPartition = this.events.reduce(
      (currEventsParition, processEvent) => {
        currEventsParition[processEvent.event.action]?.push(processEvent);
        return currEventsParition;
      },
      Object.values(EventAction).reduce((currActions, action) => {
        currActions[action] = [] as ProcessEvent[];
        return currActions;
      }, {} as EventActionPartition)
    );

    if (eventsPartition.exec.length) {
      return eventsPartition.exec[eventsPartition.exec.length - 1];
    }

    if (eventsPartition.fork.length) {
      return eventsPartition.fork[eventsPartition.fork.length - 1];
    }

    return {} as ProcessEvent;
  }

  getOutput() {
    return this.events.reduce((output, event) => {
      if (event.event.action === EventAction.output) {
        output += ''; // TODO: schema unknown
      }

      return output;
    }, '');
  }

  isUserEntered() {
    const event = this.getDetails();
    const { interactive, pgid, parent } = event?.process || {};

    return interactive && pgid !== parent.pgid;
  }

  getMaxAlertLevel() {
    // TODO:
    return null;
  }
}
