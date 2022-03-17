/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ProcessTreeNode } from '../process_tree_node';
import { BackToInvestigatedAlert } from '../back_to_investigated_alert';
import { useProcessTree } from './hooks';
import { Process, ProcessEventsPage, ProcessEvent } from '../../../common/types/process_tree';
import { useScroll } from '../../hooks/use_scroll';
import { useStyles } from './styles';

type FetchFunction = () => void;

interface ProcessTreeDeps {
  // process.entity_id to act as root node (typically a session (or entry session) leader).
  sessionEntityId: string;

  data: ProcessEventsPage[];

  jumpToEvent?: ProcessEvent;
  isFetching: boolean;
  hasNextPage: boolean | undefined;
  hasPreviousPage: boolean | undefined;
  fetchNextPage: FetchFunction;
  fetchPreviousPage: FetchFunction;

  // plain text search query (only searches "process.working_directory process.args.join(' ')"
  searchQuery?: string;

  // currently selected process
  selectedProcess?: Process | null;
  onProcessSelected: (process: Process | null) => void;
  setSearchResults?: (results: Process[]) => void;
  timeStampOn?: boolean;
  verboseModeOn?: boolean;
}

export const ProcessTree = ({
  sessionEntityId,
  data,
  jumpToEvent,
  isFetching,
  hasNextPage,
  hasPreviousPage,
  fetchNextPage,
  fetchPreviousPage,
  searchQuery,
  selectedProcess,
  onProcessSelected,
  setSearchResults,
  timeStampOn,
  verboseModeOn,
}: ProcessTreeDeps) => {
  const [isInvestigatedEventVisible, setIsInvestigatedEventVisible] = useState<boolean>(true);
  const [isInvestigatedEventAbove, setIsInvestigatedEventAbove] = useState<boolean>(false);
  const styles = useStyles();

  const { sessionLeader, processMap, searchResults } = useProcessTree({
    sessionEntityId,
    data,
    searchQuery,
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectionAreaRef = useRef<HTMLDivElement>(null);

  const onChangeJumpToEventVisibility = useCallback(
    (isVisible: boolean, isAbove: boolean) => {
      if (isVisible !== isInvestigatedEventVisible) {
        setIsInvestigatedEventVisible(isVisible);
      }
      if (!isVisible && isAbove !== isInvestigatedEventAbove) {
        setIsInvestigatedEventAbove(isAbove);
      }
    },
    [isInvestigatedEventVisible, isInvestigatedEventAbove]
  );

  const handleBackToInvestigatedAlert = useCallback(() => {
    onProcessSelected(null);
    setIsInvestigatedEventVisible(true);
  }, [onProcessSelected]);

  useEffect(() => {
    if (setSearchResults) {
      setSearchResults(searchResults);
    }
  }, [searchResults, setSearchResults]);

  useScroll({
    div: scrollerRef.current,
    handler: (pos: number, endReached: boolean) => {
      if (!isFetching && endReached) {
        fetchNextPage();
      }
    },
  });

  /**
   * highlights a process in the tree
   * we do it this way to avoid state changes on potentially thousands of <Process> components
   */
  const selectProcess = useCallback(
    (process: Process) => {
      if (!selectionAreaRef?.current || !scrollerRef?.current) {
        return;
      }

      const selectionAreaEl = selectionAreaRef.current;
      selectionAreaEl.style.display = 'block';

      // TODO: concept of alert level unknown wrt to elastic security
      const alertLevel = process.getMaxAlertLevel();

      if (alertLevel && alertLevel >= 0) {
        selectionAreaEl.style.backgroundColor =
          alertLevel > 0 ? styles.alertSelected : styles.defaultSelected;
      } else {
        selectionAreaEl.style.backgroundColor = '';
      }

      // find the DOM element for the command which is selected by id
      const processEl = scrollerRef.current.querySelector<HTMLElement>(`[data-id="${process.id}"]`);

      if (processEl) {
        processEl.prepend(selectionAreaEl);

        const cTop = scrollerRef.current.scrollTop;
        const cBottom = cTop + scrollerRef.current.clientHeight;

        const eTop = processEl.offsetTop;
        const eBottom = eTop + processEl.clientHeight;
        const isVisible = eTop >= cTop && eBottom <= cBottom;

        if (!isVisible) {
          processEl.scrollIntoView({ block: 'center' });
        }
      }
    },
    [styles.alertSelected, styles.defaultSelected]
  );

  useLayoutEffect(() => {
    if (selectedProcess) {
      selectProcess(selectedProcess);
    }
  }, [selectedProcess, selectProcess]);

  useEffect(() => {
    // after 2 pages are loaded (due to bi-directional jump to), auto select the process
    // for the jumpToEvent
    if (!selectedProcess && jumpToEvent) {
      const process = processMap[jumpToEvent.process.entity_id];

      if (process) {
        onProcessSelected(process);
        selectProcess(process);
      }
    } else if (!selectedProcess) {
      // auto selects the session leader process if no selection is made yet
      onProcessSelected(sessionLeader);
    }
  }, [jumpToEvent, processMap, onProcessSelected, selectProcess, selectedProcess, sessionLeader]);

  return (
    <>
      <div
        ref={scrollerRef}
        css={styles.scroller}
        data-test-subj="sessionView:sessionViewProcessTree"
      >
        {hasPreviousPage && (
          <EuiButton fullWidth onClick={fetchPreviousPage} isLoading={isFetching}>
            <FormattedMessage id="xpack.sessionView.loadPrevious" defaultMessage="Load previous" />
          </EuiButton>
        )}
        {sessionLeader && (
          <ProcessTreeNode
            isSessionLeader
            process={sessionLeader}
            onProcessSelected={onProcessSelected}
            jumpToEventID={jumpToEvent?.process.entity_id}
            jumpToAlertID={jumpToEvent?.kibana?.alert.uuid}
            selectedProcessId={selectedProcess?.id}
            scrollerRef={scrollerRef}
            onChangeJumpToEventVisibility={onChangeJumpToEventVisibility}
            timeStampOn={timeStampOn}
            verboseModeOn={verboseModeOn}
          />
        )}
        <div
          data-test-subj="sessionView:processTreeSelectionArea"
          ref={selectionAreaRef}
          css={styles.selectionArea}
        />
        {hasNextPage && (
          <EuiButton fullWidth onClick={fetchNextPage} isLoading={isFetching}>
            <FormattedMessage id="xpack.sessionView.loadNext" defaultMessage="Load next" />
          </EuiButton>
        )}
      </div>
      {!isInvestigatedEventVisible && (
        <BackToInvestigatedAlert
          onClick={handleBackToInvestigatedAlert}
          isDisplayedAbove={isInvestigatedEventAbove}
        />
      )}
    </>
  );
};
