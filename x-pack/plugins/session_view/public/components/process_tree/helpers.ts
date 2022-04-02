/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EventKind,
  AlertStatusEventEntityIdMap,
  Process,
  ProcessEvent,
  ProcessMap,
} from '../../../common/types/process_tree';
import { ProcessImpl } from './hooks';

// if given event is an alert, and it exist in updatedAlertsStatus, update the alert's status
// with the updated status value in updatedAlertsStatus Map
export const updateAlertEventStatus = (
  events: ProcessEvent[],
  updatedAlertsStatus: AlertStatusEventEntityIdMap
) =>
  events.map((event) => {
    // do nothing if event is not an alert
    if (!event.kibana) {
      return event;
    }

    return {
      ...event,
      kibana: {
        ...event.kibana,
        alert: {
          ...event.kibana.alert,
          workflow_status:
            updatedAlertsStatus[event.kibana.alert?.uuid]?.status ??
            event.kibana.alert?.workflow_status,
        },
      },
    };
  });

// given a page of new events, add these events to the appropriate process class model
// create a new process if none are created and return the mutated processMap
export const updateProcessMap = (processMap: ProcessMap, events: ProcessEvent[]) => {
  events.forEach((event) => {
    const { entity_id: id } = event.process;
    let process = processMap[id];

    if (!process) {
      process = new ProcessImpl(id);
      processMap[id] = process;
    }

    if (event.event.kind === EventKind.signal) {
      process.addAlert(event);
    } else {
      process.addEvent(event);
    }
  });

  return processMap;
};

// given a page of events, update process model parent child relationships
// if we cannot find a parent for a process include said process
// in the array of orphans. We track orphans in their own array, so
// we can attempt to re-parent the orphans when new pages of events are
// processed. This is especially important when paginating backwards
// (e.g in the case where the SessionView jumpToEvent prop is used, potentially skipping over ancestor processes)
export const buildProcessTree = (
  processMap: ProcessMap,
  events: ProcessEvent[],
  orphans: Process[],
  sessionEntityId: string,
  backwardDirection: boolean = false
) => {
  // we process events in reverse order when paginating backwards.
  if (backwardDirection) {
    events = events.slice().reverse();
  }

  events.forEach((event) => {
    const process = processMap[event.process.entity_id];
    const parentProcess = processMap[event.process.parent?.entity_id];
    // if session leader, or process already has a parent, return
    if (process.id === sessionEntityId || process.parent) {
      return;
    }

    if (parentProcess) {
      process.parent = parentProcess; // handy for recursive operations (like auto expand)

      if (backwardDirection) {
        parentProcess.children.unshift(process);
      } else {
        parentProcess.children.push(process);
      }
    } else if (!orphans?.includes(process)) {
      // if no parent process, process is probably orphaned
      if (backwardDirection) {
        orphans?.unshift(process);
      } else {
        orphans?.push(process);
      }
    }
  });

  const newOrphans: Process[] = [];

  // with this new page of events processed, lets try re-parent any orphans
  orphans?.forEach((process) => {
    const parentProcessId = process.getDetails()?.process?.parent?.entity_id;

    if (parentProcessId) {
      const parentProcess = processMap[parentProcessId];
      process.parent = parentProcess; // handy for recursive operations (like auto expand)
      if (parentProcess !== undefined) {
        parentProcess.children.push(process);
      }
    } else {
      newOrphans.push(process);
    }
  });

  return newOrphans;
};

// given a plain text searchQuery, iterates over all processes in processMap
// and marks ones which match the below text (currently what is rendered in the process line item)
// process.searchMatched is used by process_tree_node to highlight the text which matched the search
// this funtion also returns a list of process results which is used by session_view_search_bar to drive
// result navigation UX
// FYI: this function mutates properties of models contained in processMap
export const searchProcessTree = (processMap: ProcessMap, searchQuery: string | undefined) => {
  const results = [];

  for (const processId of Object.keys(processMap)) {
    const process = processMap[processId];

    if (searchQuery) {
      const event = process.getDetails();
      const { working_directory: workingDirectory, args } = event.process;

      // TODO: the text we search is the same as what we render.
      // in future we may support KQL searches to match against any property
      // for now plain text search is limited to searching process.working_directory + process.args
      const text = `${workingDirectory} ${args?.join(' ')}`;

      process.searchMatched = text.includes(searchQuery) ? searchQuery : null;

      if (process.searchMatched) {
        results.push(process);
      }
    } else {
      process.clearSearch();
    }
  }

  return results;
};

// Iterate over all processes in processMap, and mark each process (and it's ancestors) for auto expansion if:
// a) the process was "user entered" (aka an interactive group leader)
// b) matches the plain text search above
// Returns the processMap with it's processes autoExpand bool set to true or false
// process.autoExpand is read by process_tree_node to determine whether to auto expand it's child processes.
export const autoExpandProcessTree = (processMap: ProcessMap) => {
  for (const processId of Object.keys(processMap)) {
    const process = processMap[processId];

    if (process.searchMatched || process.isUserEntered()) {
      let { parent } = process;
      const parentIdSet = new Set<string>();

      while (parent && !parentIdSet.has(parent.id)) {
        parentIdSet.add(parent.id);
        parent.autoExpand = true;
        parent = parent.parent;
      }
    }
  }

  return processMap;
};

export const processNewEvents = (
  eventsProcessMap: ProcessMap,
  events: ProcessEvent[] | undefined,
  orphans: Process[],
  sessionEntityId: string,
  backwardDirection: boolean = false
): [ProcessMap, Process[]] => {
  if (!events || events.length === 0) {
    return [eventsProcessMap, orphans];
  }

  const updatedProcessMap = updateProcessMap(eventsProcessMap, events);
  const newOrphans = buildProcessTree(
    updatedProcessMap,
    events,
    orphans,
    sessionEntityId,
    backwardDirection
  );

  return [autoExpandProcessTree(updatedProcessMap), newOrphans];
};
