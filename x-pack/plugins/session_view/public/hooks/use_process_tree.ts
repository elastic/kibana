/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import _ from 'lodash';
import { useState, useEffect } from 'react';

interface UseProcessTreeDeps {
  sessionEntityId: string;
  forward: ProcessEvent[];
  backward?: ProcessEvent[];
  searchQuery?: string;
}

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

class ProcessImpl implements Process {
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

    if (!(eventsPartition.exec.length || eventsPartition.fork.length)) {
      // eslint-disable-next-line no-debugger
      debugger;
    }

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

type ProcessMap = {
  [key: string]: Process;
};

export const useProcessTree = ({
  sessionEntityId,
  forward,
  backward,
  searchQuery,
}: UseProcessTreeDeps) => {
  // initialize map, as well as a placeholder for session leader process
  // we add a fake session leader event, sourced from wide event data.
  // this is because we might not always have a session leader event
  // especially if we are paging in reverse from deep within a large session
  const fakeLeaderEvent = forward.find((event) => event.event.kind === EventKind.event);
  const sessionLeaderProcess = new ProcessImpl(sessionEntityId);

  if (fakeLeaderEvent) {
    fakeLeaderEvent.process = { ...fakeLeaderEvent.process, ...fakeLeaderEvent.process.entry };
    sessionLeaderProcess.events.push(fakeLeaderEvent);
  }

  const initializedProcessMap: ProcessMap = {
    [sessionEntityId]: sessionLeaderProcess,
  };

  const [processMap, setProcessMap] = useState(initializedProcessMap);
  const [forwardIndex, setForwardIndex] = useState(0);
  const [backwardIndex, setBackwardIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<Process[]>([]);
  const [orphans, setOrphans] = useState<Process[]>([]);

  const updateProcessMap = (events: ProcessEvent[]) => {
    events.forEach((event) => {
      const { entity_id: id } = event.process;
      let process = processMap[id];

      if (!process) {
        process = new ProcessImpl(id);
        processMap[id] = process;
      }

      process.events.push(event);
    });
  };

  const buildProcessTree = (events: ProcessEvent[], backwardDirection: boolean = false) => {
    events.forEach((event) => {
      const process = processMap[event.process.entity_id];
      const parentProcess = processMap[event.process.parent.entity_id];

      if (parentProcess) {
        process.parent = parentProcess; // handy for recursive operations (like auto expand)

        if (!parentProcess.children.includes(process) && parentProcess.id !== process.id) {
          if (backwardDirection) {
            parentProcess.children.unshift(process);
          } else {
            parentProcess.children.push(process);
          }
        }
      } else if (process.id !== sessionEntityId && !orphans.includes(process)) {
        // if no parent process, process is probably orphaned
        orphans.push(process);
      }
    });
  };

  const searchProcessTree = () => {
    const results = [];

    if (searchQuery) {
      for (const processId of Object.keys(processMap)) {
        const process = processMap[processId];
        const event = process.getDetails();
        const { working_directory: workingDirectory, args } = event.process;

        // TODO: the text we search is the same as what we render.
        // should this be customizable??
        const text = `${workingDirectory} ${args.join(' ')}`;

        process.searchMatched = text.includes(searchQuery) ? searchQuery : null;

        if (process.searchMatched) {
          results.push(process);
        }
      }
    } else {
      for (const processId of Object.keys(processMap)) {
        processMap[processId].searchMatched = null;
        processMap[processId].autoExpand = false;
      }
    }

    setSearchResults(results);
  };

  const autoExpandProcessTree = () => {
    for (const processId of Object.keys(processMap)) {
      const process = processMap[processId];

      if (process.searchMatched || process.isUserEntered()) {
        let { parent } = process;

        while (parent && parent.id !== parent.parent?.id) {
          parent.autoExpand = true;
          parent = parent.parent;
        }
      }
    }
  };

  const processNewEvents = (
    events: ProcessEvent[] | undefined,
    backwardDirection: boolean = false
  ) => {
    if (!events || events.length === 0) {
      return;
    }

    updateProcessMap(events);
    buildProcessTree(events, backwardDirection);
    autoExpandProcessTree();
  };

  useEffect(() => {
    if (backward) {
      processNewEvents(backward.slice(0, backward.length - backwardIndex), true);
      setBackwardIndex(backward.length);
    }

    processNewEvents(forward.slice(forwardIndex));
    setForwardIndex(forward.length);

    setProcessMap({ ...processMap });
    setOrphans([...orphans]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forward, backward]);

  useEffect(() => {
    searchProcessTree();
    autoExpandProcessTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // return the root session leader process, and a list of orphans
  return { sessionLeader: processMap[sessionEntityId], orphans, searchResults };
};
