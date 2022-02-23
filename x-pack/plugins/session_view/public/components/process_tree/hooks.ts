/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import _ from 'lodash';
import memoizeOne from 'memoize-one';
import { useState, useEffect } from 'react';
import {
  EventAction,
  EventKind,
  EventActionPartition,
  Process,
  ProcessEvent,
  ProcessMap,
  ProcessEventsPage,
} from '../../../common/types/process_tree';
import { processNewEvents, searchProcessTree, autoExpandProcessTree } from './helpers';
import { sortProcesses } from '../../../common/utils/sort_processes';

interface UseProcessTreeDeps {
  sessionEntityId: string;
  data: ProcessEventsPage[];
  searchQuery?: string;
}

export class ProcessImpl implements Process {
  id: string;
  events: ProcessEvent[];
  children: Process[];
  parent: Process | undefined;
  autoExpand: boolean;
  searchMatched: string | null;
  orphans: Process[];

  constructor(id: string) {
    this.id = id;
    this.events = [];
    this.children = [];
    this.orphans = [];
    this.autoExpand = false;
    this.searchMatched = null;
  }

  addEvent(event: ProcessEvent) {
    // rather than push new events on the array, we return a new one
    // this helps the below memoizeOne functions to behave correctly.
    this.events = this.events.concat(event);
  }

  // hideSameGroup will filter out any processes which have the same pgid as this process
  getChildren(hideSameGroup: boolean = false) {
    let children = this.children;

    // if there are orphans, we just render them inline with the other child processes (currently only session leader does this)
    if (this.orphans.length) {
      children = [...children, ...this.orphans].sort(sortProcesses);
    }

    if (hideSameGroup) {
      const { pid } = this.getDetails().process;

      return children.filter((process) => {
        const pgid = process.getDetails().process.group_leader.pid;

        // TODO: needs update after field rename to match ECS
        return pgid !== pid || process.searchMatched;
      });
    }

    return children;
  }

  hasOutput() {
    return !!this.findEventByAction(this.events, EventAction.output);
  }

  hasAlerts() {
    return !!this.findEventByKind(this.events, EventKind.signal);
  }

  getAlerts() {
    return this.filterEventsByKind(this.events, EventKind.signal);
  }

  hasExec() {
    return !!this.findEventByAction(this.events, EventAction.exec);
  }

  hasExited() {
    return !!this.findEventByAction(this.events, EventAction.end);
  }

  getDetails() {
    return this.getDetailsMemo(this.events);
  }

  getOutput() {
    // not implemented, output ECS schema not defined (for a future release)
    return '';
  }

  isUserEntered() {
    const event = this.getDetails();
    const { tty } = event.process;

    return !!tty && process.pid === event.process.group_leader.pid;
  }

  getMaxAlertLevel() {
    // TODO: as part of alerts details work + tie in with the new alert flyout
    return null;
  }

  findEventByAction = memoizeOne((events: ProcessEvent[], action: EventAction) => {
    return events.find(({ event }) => event.action === action);
  });

  findEventByKind = memoizeOne((events: ProcessEvent[], kind: EventKind) => {
    return events.find(({ event }) => event.kind === kind);
  });

  filterEventsByAction = memoizeOne((events: ProcessEvent[], action: EventAction) => {
    return events.filter(({ event }) => event.action === action);
  });

  filterEventsByKind = memoizeOne((events: ProcessEvent[], kind: EventKind) => {
    return events.filter(({ event }) => event.kind === kind);
  });

  getDetailsMemo = memoizeOne((events: ProcessEvent[]) => {
    const eventsPartition = events.reduce(
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
  });
}

export const useProcessTree = ({ sessionEntityId, data, searchQuery }: UseProcessTreeDeps) => {
  // initialize map, as well as a placeholder for session leader process
  // we add a fake session leader event, sourced from wide event data.
  // this is because we might not always have a session leader event
  // especially if we are paging in reverse from deep within a large session
  const fakeLeaderEvent = data[0].events.find((event) => event.event.kind === EventKind.event);
  const sessionLeaderProcess = new ProcessImpl(sessionEntityId);

  if (fakeLeaderEvent) {
    fakeLeaderEvent.process = {
      ...fakeLeaderEvent.process,
      ...fakeLeaderEvent.process.entry_leader,
    };
    sessionLeaderProcess.events.push(fakeLeaderEvent);
  }

  const initializedProcessMap: ProcessMap = {
    [sessionEntityId]: sessionLeaderProcess,
  };

  const [processMap, setProcessMap] = useState(initializedProcessMap);
  const [processedPages, setProcessedPages] = useState<ProcessEventsPage[]>([]);
  const [searchResults, setSearchResults] = useState<Process[]>([]);
  const [orphans, setOrphans] = useState<Process[]>([]);

  useEffect(() => {
    let eventsProcessMap: ProcessMap = processMap;
    let newOrphans: Process[] = orphans;
    const newProcessedPages: ProcessEventsPage[] = [];

    data.forEach((page, i) => {
      const processed = processedPages.find((p) => p.cursor === page.cursor);

      if (!processed) {
        const backwards = i < processedPages.length;

        const result = processNewEvents(
          eventsProcessMap,
          page.events,
          orphans,
          sessionEntityId,
          backwards
        ) as [ProcessMap, Process[]];

        eventsProcessMap = result[0];
        newOrphans = result[1];

        newProcessedPages.push(page);
      }
    });

    setProcessMap({ ...eventsProcessMap });
    setProcessedPages([...processedPages, ...newProcessedPages]);
    setOrphans(newOrphans);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    setSearchResults(searchProcessTree(processMap, searchQuery));
    autoExpandProcessTree(processMap);
  }, [searchQuery, processMap]);

  // set new orphans array on the session leader
  const sessionLeader = processMap[sessionEntityId];

  sessionLeader.orphans = orphans;

  return { sessionLeader: processMap[sessionEntityId], processMap, searchResults };
};
