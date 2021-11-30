/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import _ from 'lodash';
import { useState, useEffect } from 'react';
import { EventKind, Process, ProcessImpl, ProcessEvent } from '../../common/types/process_tree';

interface UseProcessTreeDeps {
  sessionEntityId: string;
  forward: ProcessEvent[];
  backward?: ProcessEvent[];
  searchQuery?: string;
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
