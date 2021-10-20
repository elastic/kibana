/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';

interface UseProcessTreeDeps {
  sessionId: string;
  forward: IProcessEvent[];
  backward?: IProcessEvent[];
  searchQuery?: string;
}

export enum Action {
  fork = 'fork',
  exec = 'exec',
  end = 'end',
  output = 'output',
}

interface IUser {
  id: string;
  name: string;
}

interface IProcessFields {
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
  user: IUser;
}

interface IProcessSelf extends IProcessFields {
  parent: IProcessFields;
  session: IProcessFields;
  entry: IProcessFields;
  last_user_entered?: IProcessFields;
}

export interface IProcessEvent {
  '@timestamp': string;
  event: {
    kind: string;
    category: string;
    action: string;
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
  process: IProcessSelf;

  //TODO: alerts? output? file_descriptors?
}

export interface IProcess {
  events: IProcessEvent[];
  children: IProcess[];
  parent: IProcess | undefined;
  autoExpand: boolean;
  searchMatched: string | null; // either false, or set to searchQuery
  getEntityID(): string;
  hasOutput(): boolean;
  hasAlerts(): boolean;
  getOutput(): string;
  getLatest(): IProcessEvent;
  isUserEntered(): boolean;
  getMaxAlertLevel(): number | null;
}

class Process implements IProcess {
  events: IProcessEvent[];
  children: IProcess[];
  parent: IProcess | undefined;
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
    return !!this.events.find(({ event }) => event.kind === 'alert');
  }

  getLatest() {
    const forksExecsOnly = this.events.filter((event) => {
      return [Action.fork, Action.exec, Action.end].includes(event.event.action as Action);
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
    //TODO:
    return null;
  }
}

type ProcessMap = {
  [key: string]: Process;
};

const useProcessTree = ({ sessionId, forward, backward, searchQuery }: UseProcessTreeDeps) => {
  // initialize map, as well as a placeholder for session leader process
  const initializedProcessMap: ProcessMap = {
    [sessionId]: new Process(),
  };

  const [processMap, setProcessMap] = useState(initializedProcessMap);
  const [forwardIndex, setForwardIndex] = useState(0);
  const [backwardIndex, setBackwardIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<IProcess[]>([]);
  const [orphans, setOrphans] = useState<IProcess[]>([]);

  const updateProcessMap = (eventsToProcess: IProcessEvent[]) => {
    eventsToProcess.forEach((event) => {
      let process = processMap[event.process.entity_id];

      if (!process) {
        process = new Process();
        processMap[event.process.entity_id] = process;
      }

      process.events.push(event);
    });
  };

  const buildProcessTree = (eventsToProcess: IProcessEvent[], backward: boolean = false) => {
    eventsToProcess.forEach((event) => {
      const process = processMap[event.process.entity_id];
      const parentProcess = processMap[event.process.parent.entity_id];

      if (parentProcess) {
        process.parent = parentProcess; // handy for recursive operations (like auto expand)

        return backward
          ? parentProcess.children.unshift(process)
          : parentProcess.children.push(process);
      } else if (!orphans.includes(process)) {
        // if no parent process, process is probably orphaned
        orphans.push(process);
      }
    });
  };

  const searchProcessTree = () => {
    const results = [];

    if (searchQuery) {
      for (let processId in processMap) {
        const process = processMap[processId];
        const event = process.getLatest();
        const { working_directory, args } = event.process;

        //TODO: the text we search is the same as what we render.
        // should this be customizable??
        const text = `${working_directory} ${args.join(' ')}`;

        process.searchMatched = text.includes(searchQuery) ? searchQuery : null;

        if (process.searchMatched) {
          results.push(process);
        }
      }
    }

    setSearchResults(results);
  };

  const autoExpandProcessTree = () => {
    for (let processId in processMap) {
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

  const processEvents = (
    eventsToProcess: IProcessEvent[] | undefined,
    backward: boolean = false
  ) => {
    if (!eventsToProcess || eventsToProcess.length === 0) {
      return;
    }

    console.log(`processing ${eventsToProcess.length} commands`);

    updateProcessMap(eventsToProcess);
    buildProcessTree(eventsToProcess, backward);
    autoExpandProcessTree();
  };

  useEffect(() => {
    if (backward) {
      processEvents(backward.slice(0, backward.length - backwardIndex), true);
      setBackwardIndex(backward.length);
    }

    processEvents(forward.slice(forwardIndex));
    setForwardIndex(forward.length);

    setProcessMap({ ...processMap });
    setOrphans([...orphans]);
  }, [forward, backward]);

  useEffect(() => {
    searchProcessTree();
    autoExpandProcessTree();
  }, [searchQuery]);

  // return the root session leader process, and a list of orphans
  return { sessionLeader: processMap[sessionId], orphans, searchResults };
};

export default useProcessTree;
