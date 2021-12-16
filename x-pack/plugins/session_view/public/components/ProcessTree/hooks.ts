/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import _ from 'lodash';
import { useState, useEffect } from 'react';
import {
  EventAction,
  EventKind,
  EventActionPartition,
  Process,
  ProcessEvent,
  ProcessMap,
} from '../../../common/types/process_tree';
import { processNewEvents, searchProcessTree, autoExpandProcessTree } from './helpers';

interface UseProcessTreeDeps {
  sessionEntityId: string;
  forward: ProcessEvent[];
  backward?: ProcessEvent[];
  searchQuery?: string;
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

    return this.events[this.events.length - 1] || ({} as ProcessEvent);
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

  useEffect(() => {
    let eventsProcessMap: ProcessMap = processMap;
    if (backward) {
      eventsProcessMap = processNewEvents(
        eventsProcessMap,
        backward.slice(0, backward.length - backwardIndex),
        orphans,
        sessionEntityId,
        true
      );
      setBackwardIndex(backward.length);
    }

    eventsProcessMap = processNewEvents(
      eventsProcessMap,
      forward.slice(forwardIndex),
      orphans,
      sessionEntityId
    );
    setForwardIndex(forward.length);

    setProcessMap({ ...eventsProcessMap });
    setOrphans([...orphans]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forward, backward]);

  useEffect(() => {
    setSearchResults(searchProcessTree(processMap, searchQuery));
    autoExpandProcessTree(processMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // return the root session leader process, and a list of orphans
  return { sessionLeader: processMap[sessionEntityId], orphans, searchResults };
};
