/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Process, ProcessEvent, ProcessMap } from '../../../common/types/process_tree';
import { ProcessImpl } from './hooks';

export const updateProcessMap = (processMap: ProcessMap, events: ProcessEvent[]) => {
  events.forEach((event) => {
    const { entity_id: id } = event.process;
    let process = processMap[id];

    if (!process) {
      process = new ProcessImpl(id);
      processMap[id] = process;
    }

    process.events.push(event);
  });

  return processMap;
};

export const buildProcessTree = (
  processMap: ProcessMap,
  events: ProcessEvent[],
  orphans: Process[],
  sessionEntityId: string,
  backwardDirection: boolean = false
) => {
  events.forEach((event) => {
    const process = processMap[event.process.entity_id];
    const parentProcess = processMap[event.process.parent?.entity_id];

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

  return processMap;
};

export const searchProcessTree = (processMap: ProcessMap, searchQuery: string | undefined) => {
  const results = [];

  if (searchQuery) {
    for (const processId of Object.keys(processMap)) {
      const process = processMap[processId];
      const event = process.getDetails();
      const { working_directory: workingDirectory, args } = event.process;

      // TODO: the text we search is the same as what we render.
      // should this be customizable??
      const text = `${workingDirectory} ${args?.join(' ')}`;

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

  return results;
};

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
) => {
  if (!events || events.length === 0) {
    return eventsProcessMap;
  }

  const updatedProcessMap = updateProcessMap(eventsProcessMap, events);
  const builtProcessMap = buildProcessTree(
    updatedProcessMap,
    events,
    orphans,
    sessionEntityId,
    backwardDirection
  );
  return autoExpandProcessTree(builtProcessMap);
};
