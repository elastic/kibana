/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useLayoutEffect, useCallback } from 'react';
import Process from '../Process';
import useProcessTree, { IProcessEvent, IProcess } from '../../hooks/use_process_tree';
import useScroll from '../../hooks/use_scroll';
import { useEuiTheme } from '@elastic/eui';

interface IProcessTreeDeps {
  sessionId: string;
  forward: IProcessEvent[];
  backward?: IProcessEvent[];
  searchQuery?: string;
  selectedProcess: IProcess | null;
  onProcessSelected(process: IProcess): void;
}

const ProcessTree = ({
  sessionId,
  forward,
  backward,
  searchQuery,
  selectedProcess,
  onProcessSelected,
}: IProcessTreeDeps) => {
  const { euiTheme } = useEuiTheme();
  const { sessionLeader, orphans, searchResults } = useProcessTree({
    sessionId,
    forward,
    backward,
    searchQuery,
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectionAreaRef = useRef<HTMLDivElement>(null);

  useScroll({
    div: scrollerRef.current,
    handler: (pos: number, endReached: boolean) => {
      if (endReached) {
        console.log('end reached');
        //TODO: call load more
      }

      console.log(pos);
    },
  });

  /**
   * highlights a process in the tree
   * we do it this way to avoid state changes on potentially thousands of <Process> components
   */
  const selectProcess = useCallback((process: IProcess) => {
    if (!selectionAreaRef || !scrollerRef) {
      return;
    }

    if (!selectionAreaRef.current || !scrollerRef.current) {
      return;
    }

    const selectionAreaEl = selectionAreaRef.current;
    selectionAreaEl.style.display = 'block';

    //TODO: concept of alert level unknown wrt to elastic security
    const alertLevel = process.getMaxAlertLevel();

    if (alertLevel && alertLevel >= 0) {
      selectionAreaEl.style.backgroundColor =
        alertLevel > 0 ? 'rgba(229, 115, 115, 0.24)' : '#F2C94C4A';
    } else {
      selectionAreaEl.style.backgroundColor = '';
    }

    // find the DOM element for the command which is selected by id
    let processEl = scrollerRef.current.querySelector(`[data-id="${process.getEntityID()}"]`);

    if (processEl) {
      processEl.prepend(selectionAreaEl);
    }
  }, []);

  useLayoutEffect(() => {
    if (selectedProcess) {
      selectProcess(selectedProcess);
    }
  }, [selectedProcess, selectProcess]);

  const defaultSelectionColor = euiTheme.colors.accent;
  const padding = euiTheme.size.s;

  const scrollerCSS = `
    font-family: ${euiTheme.font.familyCode};
    overflow: auto;
    height: 100%;
    background-color: ${euiTheme.colors.lightestShade};
    padding-top: ${padding};
    padding-left: ${padding};
    display: flex;
    flex-direction: column;
  `;

  const selectionAreaCSS = `
    position: absolute;
    display: none;
    margin-left: -50%;
    width: 150%;
    height: 100%;
    background-color: ${defaultSelectionColor};
    pointer-events:none;
    opacity: .1;
  `;

  //TODO: processes without parents.
  // haven't decided whether to just add to session leader
  // or some other UX treatment (reparenting to init?)
  console.log(orphans);

  //TODO: search input and results navigation
  console.log(searchResults);

  return (
    <div ref={scrollerRef} css={scrollerCSS}>
      {sessionLeader && (
        <Process isSessionLeader process={sessionLeader} onProcessSelected={onProcessSelected} />
      )}
      <div ref={selectionAreaRef} css={selectionAreaCSS} />
    </div>
  );
};

export default ProcessTree;
