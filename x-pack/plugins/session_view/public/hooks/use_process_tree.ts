/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';

interface UseProcessTreeDeps {
  sessionId: string;
  forward: ProcessEvent[];
  backward?: ProcessEvent[];
  searchQuery?: string;
}

export enum Action {
  fork = 'fork',
  exec = 'exec',
  end = 'end',
  output = 'output',
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

interface ProcessSelf extends ProcessFields {
  parent: ProcessFields;
  session: ProcessFields;
  entry: ProcessFields;
  last_user_entered?: ProcessFields;
}

export interface ProcessEvent {
  '@timestamp': string;
  event: {
    kind: string;
    category: string;
    action: Action;
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

  // TODO: alerts? output? file_descriptors?
}

export interface Process {
  events: ProcessEvent[];
  children: Process[];
  parent: Process | undefined;
  autoExpand: boolean;
  searchMatched: string | null; // either false, or set to searchQuery
  getEntityID(): string;
  hasOutput(): boolean;
  hasAlerts(): boolean;
  getOutput(): string;
  getLatest(): ProcessEvent;
  isUserEntered(): boolean;
  getMaxAlertLevel(): number | null;
}

class ProcessImpl implements Process {
  events: ProcessEvent[];
  children: Process[];
  parent: Process | undefined;
  autoExpand: boolean;
  searchMatched: string | null;

  constructor() {
    this.events = [];
    this.children = [];
    this.autoExpand = false;
    this.searchMatched = null;
  }

  getEntityID() {
    return this.getLatest().process.entity_id;
  }

  hasOutput() {
    // TODO: schema undecided
    return !!this.events.find(({ event }) => event.action === Action.output);
  }

  hasAlerts() {
    // TODO: endpoint alerts schema uncertain (kind = alert comes from ECS)
    // endpoint-dev code sets event.action to rule_detection and rule_prevention.
    // alerts mechanics at elastic needs a research spike.
    return !!this.events.find(({ event }) => event.kind === 'alert');
  }

  getLatest() {
    const forksExecsOnly = this.events.filter((event) => {
      return [Action.fork, Action.exec, Action.end].includes(event.event.action);
    });

    // returns the most recent fork, exec, or exit
    return forksExecsOnly[forksExecsOnly.length - 1];
  }

  getOutput() {
    return this.events.reduce((output, event) => {
      if (event.event.action === Action.output) {
        output += ''; // TODO: schema unknown
      }

      return output;
    }, '');
  }

  isUserEntered() {
    const event = this.getLatest();
    const { interactive, pgid, parent } = event.process;

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
  sessionId,
  forward,
  backward,
  searchQuery,
}: UseProcessTreeDeps) => {
  // initialize map, as well as a placeholder for session leader process
  const initializedProcessMap: ProcessMap = {
    [sessionId]: new ProcessImpl(),
  };

  const [processMap, setProcessMap] = useState(initializedProcessMap);
  const [forwardIndex, setForwardIndex] = useState(0);
  const [backwardIndex, setBackwardIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<Process[]>([]);
  const [orphans, setOrphans] = useState<Process[]>([]);

  const updateProcessMap = (events: ProcessEvent[]) => {
    events.forEach((event) => {
      let process = processMap[event.process.entity_id];

      if (!process) {
        process = new ProcessImpl();
        processMap[event.process.entity_id] = process;
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

        if (!parentProcess.children.includes(process)) {
          if (backwardDirection) {
            parentProcess.children.unshift(process);
          } else {
            parentProcess.children.push(process);
          }
        }
      } else if (!orphans.includes(process)) {
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
        const event = process.getLatest();
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

        while (parent) {
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
  return { sessionLeader: processMap[sessionId], orphans, searchResults };
};
