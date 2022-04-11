/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ProcessTreeNode } from '../process_tree_node';
import { BackToInvestigatedAlert } from '../back_to_investigated_alert';
import { useProcessTree } from './hooks';
import { ProcessTreeLoadMoreButton } from '../process_tree_load_more_button';
import {
  AlertStatusEventEntityIdMap,
  Process,
  ProcessEventsPage,
  ProcessEvent,
} from '../../../common/types/process_tree';
import { useScroll } from '../../hooks/use_scroll';
import { useStyles } from './styles';
import { PROCESS_EVENTS_PER_PAGE } from '../../../common/constants';

type FetchFunction = () => void;

const LOAD_NEXT_TEXT = i18n.translate('xpack.sessionView.processTree.loadMore', {
  defaultMessage: 'Show {pageSize} next events',
  values: {
    pageSize: PROCESS_EVENTS_PER_PAGE,
  },
});

const LOAD_PREVIOUS_TEXT = i18n.translate('xpack.sessionView.processTree.loadPrevious', {
  defaultMessage: 'Show {pageSize} previous events',
  values: {
    pageSize: PROCESS_EVENTS_PER_PAGE,
  },
});

export interface ProcessTreeDeps {
  // process.entity_id to act as root node (typically a session (or entry session) leader).
  sessionEntityId: string;

  data: ProcessEventsPage[];
  alerts: ProcessEvent[];

  jumpToEntityId?: string;
  investigatedAlertId?: string;
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

  // a map for alerts with updated status and process.entity_id
  updatedAlertsStatus: AlertStatusEventEntityIdMap;
  onShowAlertDetails: (alertUuid: string) => void;
  showTimestamp?: boolean;
  verboseMode?: boolean;
}

export const ProcessTree = ({
  sessionEntityId,
  data,
  alerts,
  jumpToEntityId,
  investigatedAlertId,
  isFetching,
  hasNextPage,
  hasPreviousPage,
  fetchNextPage,
  fetchPreviousPage,
  searchQuery,
  selectedProcess,
  onProcessSelected,
  setSearchResults,
  updatedAlertsStatus,
  onShowAlertDetails,
  showTimestamp = true,
  verboseMode = false,
}: ProcessTreeDeps) => {
  const [isInvestigatedEventVisible, setIsInvestigatedEventVisible] = useState<boolean>(true);
  const [isInvestigatedEventAbove, setIsInvestigatedEventAbove] = useState<boolean>(false);
  const styles = useStyles();

  const { sessionLeader, processMap, searchResults } = useProcessTree({
    sessionEntityId,
    data,
    alerts,
    searchQuery,
    updatedAlertsStatus,
    verboseMode,
    jumpToEntityId,
  });

  const eventsRemaining = useMemo(() => {
    const total = data?.[0]?.total || 0;
    const loadedSoFar = data.reduce((prev, current) => {
      return prev + (current?.events?.length || 0);
    }, 0);

    return total - loadedSoFar;
  }, [data]);

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

        const { height: elHeight, y: elTop } = processEl.getBoundingClientRect();
        const { y: viewPortElTop, height: viewPortElHeight } =
          scrollerRef.current.getBoundingClientRect();

        const viewPortElBottom = viewPortElTop + viewPortElHeight;
        const elBottom = elTop + elHeight;
        const isVisible = elBottom >= viewPortElTop && elTop <= viewPortElBottom;

        // jest will die when calling scrollIntoView (perhaps not part of the DOM it executes under)
        if (!isVisible && processEl.scrollIntoView) {
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
    if (jumpToEntityId) {
      const process = processMap[jumpToEntityId];
      const hasDetails = !!process?.getDetails();

      if (!selectedProcess && hasDetails) {
        onProcessSelected(process);
      }
    } else if (!selectedProcess) {
      onProcessSelected(sessionLeader);
    }
  }, [
    jumpToEntityId,
    processMap,
    onProcessSelected,
    selectProcess,
    selectedProcess,
    sessionLeader,
  ]);

  return (
    <>
      <div
        ref={scrollerRef}
        css={styles.scroller}
        data-test-subj="sessionView:sessionViewProcessTree"
      >
        {sessionLeader && (
          <ProcessTreeNode
            isSessionLeader
            process={sessionLeader}
            onProcessSelected={onProcessSelected}
            jumpToEntityId={jumpToEntityId}
            investigatedAlertId={investigatedAlertId}
            selectedProcessId={selectedProcess?.id}
            scrollerRef={scrollerRef}
            onChangeJumpToEventVisibility={onChangeJumpToEventVisibility}
            onShowAlertDetails={onShowAlertDetails}
            showTimestamp={showTimestamp}
            verboseMode={verboseMode}
            searchResults={searchResults}
            loadPreviousButton={
              hasPreviousPage ? (
                <ProcessTreeLoadMoreButton
                  text={LOAD_PREVIOUS_TEXT}
                  onClick={fetchPreviousPage}
                  isFetching={isFetching}
                  eventsRemaining={eventsRemaining}
                  forward={false}
                />
              ) : null
            }
            loadNextButton={
              hasNextPage ? (
                <ProcessTreeLoadMoreButton
                  text={LOAD_NEXT_TEXT}
                  onClick={fetchNextPage}
                  isFetching={isFetching}
                  eventsRemaining={eventsRemaining}
                  forward={true}
                />
              ) : null
            }
          />
        )}
        <div
          data-test-subj="sessionView:processTreeSelectionArea"
          ref={selectionAreaRef}
          css={styles.selectionArea}
        />
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
