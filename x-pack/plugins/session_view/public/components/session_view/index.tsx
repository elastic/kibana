/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiFlexItem,
  EuiResizableContainer,
  EuiPanel,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiBetaBadge,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { SectionLoading } from '../../shared_imports';
import { ProcessTree } from '../process_tree';
import {
  AlertStatusEventEntityIdMap,
  Process,
  ProcessEvent,
} from '../../../common/types/process_tree';
import { DisplayOptionsState } from '../../../common/types/session_view';
import { SessionViewDeps } from '../../types';
import { SessionViewDetailPanel } from '../session_view_detail_panel';
import { SessionViewSearchBar } from '../session_view_search_bar';
import { SessionViewDisplayOptions } from '../session_view_display_options';
import { TTYPlayer } from '../tty_player';
import { useStyles } from './styles';
import {
  useFetchAlertStatus,
  useFetchSessionViewProcessEvents,
  useFetchSessionViewAlerts,
  useFetchGetTotalIOBytes,
} from './hooks';
import { LOCAL_STORAGE_DISPLAY_OPTIONS_KEY } from '../../../common/constants';
import { BETA, REFRESH_SESSION, OPEN_TTY_PLAYER } from './translations';

/**
 * The main wrapper component for the session view.
 */
export const SessionView = ({
  sessionEntityId,
  height,
  isFullScreen = false,
  jumpToEntityId,
  jumpToCursor,
  investigatedAlertId,
  loadAlertDetails,
}: SessionViewDeps) => {
  // don't engage jumpTo if jumping to session leader.
  if (jumpToEntityId === sessionEntityId) {
    jumpToEntityId = undefined;
    jumpToCursor = undefined;
  }

  const [showTTY, setShowTTY] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Process[] | null>(null);
  const [displayOptions, setDisplayOptions] = useLocalStorage<DisplayOptionsState>(
    LOCAL_STORAGE_DISPLAY_OPTIONS_KEY,
    {
      timestamp: true,
      verboseMode: false,
    }
  );
  const [fetchAlertStatus, setFetchAlertStatus] = useState<string[]>([]);
  const [updatedAlertsStatus, setUpdatedAlertsStatus] = useState<AlertStatusEventEntityIdMap>({});
  const [currentJumpToCursor, setCurrentJumpToCursor] = useState(jumpToCursor);
  const [currentJumpToEntityId, setCurrentJumpToEntityId] = useState(jumpToEntityId);

  const styles = useStyles({ height, isFullScreen });

  const detailPanelCollapseFn = useRef(() => {});

  // to give an indication to the user that there may be more search results if they turn on verbose mode.
  const showVerboseSearchTooltip = useMemo(() => {
    return !!(!displayOptions?.verboseMode && searchQuery && searchResults?.length === 0);
  }, [displayOptions?.verboseMode, searchResults, searchQuery]);

  const onToggleTTY = useCallback(() => {
    setShowTTY(!showTTY);
  }, [showTTY]);

  const onProcessSelected = useCallback((process: Process | null) => {
    setSelectedProcess(process);
  }, []);

  const onJumpToEvent = useCallback(
    (event: ProcessEvent) => {
      if (event.process) {
        const { entity_id: entityId } = event.process;
        if (entityId !== sessionEntityId) {
          const alert = event.kibana?.alert;
          const cursor = alert ? alert?.original_time : event['@timestamp'];

          if (cursor) {
            setCurrentJumpToEntityId(entityId);
            setCurrentJumpToCursor(cursor);
          }
        }
        setSelectedProcess(null);
      }
    },
    [sessionEntityId]
  );

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    fetchPreviousPage,
    hasPreviousPage,
    refetch,
  } = useFetchSessionViewProcessEvents(sessionEntityId, currentJumpToCursor);

  const {
    data: alertsData,
    fetchNextPage: fetchNextPageAlerts,
    isFetching: isFetchingAlerts,
    hasNextPage: hasNextPageAlerts,
    error: alertsError,
    refetch: refetchAlerts,
  } = useFetchSessionViewAlerts(sessionEntityId, investigatedAlertId);

  const handleRefresh = useCallback(() => {
    refetch({ refetchPage: (page, index, allPages) => allPages.length - 1 === index });
    refetchAlerts({ refetchPage: (page, index, allPages) => allPages.length - 1 === index });
  }, [refetch, refetchAlerts]);

  const alerts = useMemo(() => {
    let events: ProcessEvent[] = [];

    if (alertsData) {
      alertsData.pages.forEach((page) => {
        events = events.concat(page.events);
      });
    }

    return events;
  }, [alertsData]);

  const alertsCount = useMemo(() => {
    return alertsData?.pages?.[0].total || 0;
  }, [alertsData]);

  const hasError = error || alertsError;
  const dataLoaded = data && data.pages?.length > (jumpToCursor ? 1 : 0);
  const renderIsLoading = isFetching && !dataLoaded;
  const hasData = dataLoaded && data.pages[0].events.length > 0;
  const { data: newUpdatedAlertsStatus } = useFetchAlertStatus(
    updatedAlertsStatus,
    fetchAlertStatus[0] ?? ''
  );

  const { data: totalTTYOutputBytes } = useFetchGetTotalIOBytes(sessionEntityId);
  const hasTTYOutput = !!totalTTYOutputBytes;

  useEffect(() => {
    if (newUpdatedAlertsStatus) {
      setUpdatedAlertsStatus({ ...newUpdatedAlertsStatus });
      // clearing alertUuids fetched without triggering a re-render
      fetchAlertStatus.shift();
    }
  }, [newUpdatedAlertsStatus, fetchAlertStatus]);

  const onSearchIndexChange = useCallback(
    (index: number) => {
      if (searchResults) {
        const process = searchResults[index];

        if (process) {
          onProcessSelected(process);
        }
      }
    },
    [onProcessSelected, searchResults]
  );

  const handleOnAlertDetailsClosed = useCallback((alertUuid: string) => {
    setFetchAlertStatus([alertUuid]);
  }, []);

  const toggleDetailPanel = useCallback(() => {
    detailPanelCollapseFn.current();
    setIsDetailOpen(!isDetailOpen);
  }, [isDetailOpen]);

  const onShowAlertDetails = useCallback(
    (alertUuid: string) => {
      if (loadAlertDetails) {
        loadAlertDetails(alertUuid, () => handleOnAlertDetailsClosed(alertUuid));
      }
    },
    [loadAlertDetails, handleOnAlertDetailsClosed]
  );

  const handleOptionChange = useCallback(
    (checkedOptions: DisplayOptionsState) => {
      setDisplayOptions(checkedOptions);
    },
    [setDisplayOptions]
  );

  if (renderIsLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.sessionView.loadingProcessTree"
          defaultMessage="Loading session…"
        />
      </SectionLoading>
    );
  }

  if (!hasData) {
    return (
      <EuiEmptyPrompt
        data-test-subj="sessionView:sessionViewProcessEventsEmpty"
        title={
          <h2>
            <FormattedMessage
              id="xpack.sessionView.emptyDataTitle"
              defaultMessage="No data to render"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.sessionView.emptyDataMessage"
              defaultMessage="No process events found for this query."
            />
          </p>
        }
      />
    );
  }

  return (
    <div css={styles.sessionViewerComponent}>
      <EuiPanel hasShadow={false} borderRadius="none" className="sessionViewerToolbar">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiBetaBadge label={BETA} size="s" css={styles.betaBadge} />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="sessionView:sessionViewProcessEventsSearch">
            <SessionViewSearchBar
              searchQuery={searchQuery}
              totalMatches={searchResults?.length || 0}
              setSearchQuery={setSearchQuery}
              onPrevious={onSearchIndexChange}
              onNext={onSearchIndexChange}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="refresh"
              display="empty"
              onClick={handleRefresh}
              size="m"
              aria-label={REFRESH_SESSION}
              data-test-subj="sessionView:sessionViewRefreshButton"
              isLoading={isFetching}
            />
          </EuiFlexItem>

          {hasTTYOutput && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                isSelected={showTTY}
                display={showTTY ? 'fill' : 'empty'}
                iconType="apmTrace"
                onClick={onToggleTTY}
                size="m"
                aria-label={OPEN_TTY_PLAYER}
                data-test-subj="sessionView:TTYPlayerToggle"
              />
            </EuiFlexItem>
          )}

          <EuiFlexItem grow={false}>
            <SessionViewDisplayOptions
              displayOptions={displayOptions!}
              onChange={handleOptionChange}
              showVerboseSearchTooltip={showVerboseSearchTooltip}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={toggleDetailPanel}
              iconType="list"
              data-test-subj="sessionView:sessionViewDetailPanelToggle"
              fill={isDetailOpen}
            >
              <FormattedMessage
                id="xpack.sessionView.buttonOpenDetailPanel"
                defaultMessage="Detail panel"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiResizableContainer>
        {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
          detailPanelCollapseFn.current = () => {
            togglePanel?.('session-detail-panel', { direction: 'left' });
          };

          return (
            <>
              <EuiResizablePanel initialSize={100} minSize="60%" paddingSize="none">
                {hasError && (
                  <EuiEmptyPrompt
                    iconType="alert"
                    color="danger"
                    title={
                      <h2>
                        <FormattedMessage
                          id="xpack.sessionView.errorHeading"
                          defaultMessage="Error loading Session View"
                        />
                      </h2>
                    }
                    body={
                      <p>
                        <FormattedMessage
                          id="xpack.sessionView.errorMessage"
                          defaultMessage="There was an error loading the Session View."
                        />
                      </p>
                    }
                  />
                )}

                {hasData && (
                  <div css={styles.processTree}>
                    <ProcessTree
                      key={sessionEntityId + currentJumpToCursor}
                      sessionEntityId={sessionEntityId}
                      data={data.pages}
                      searchQuery={searchQuery}
                      selectedProcess={selectedProcess}
                      onProcessSelected={onProcessSelected}
                      jumpToEntityId={currentJumpToEntityId}
                      investigatedAlertId={investigatedAlertId}
                      isFetching={isFetching}
                      hasPreviousPage={hasPreviousPage}
                      hasNextPage={hasNextPage}
                      fetchNextPage={fetchNextPage}
                      fetchPreviousPage={fetchPreviousPage}
                      setSearchResults={setSearchResults}
                      updatedAlertsStatus={updatedAlertsStatus}
                      onShowAlertDetails={onShowAlertDetails}
                      showTimestamp={displayOptions?.timestamp}
                      verboseMode={displayOptions?.verboseMode}
                    />
                  </div>
                )}
              </EuiResizablePanel>

              <EuiResizableButton css={styles.resizeHandle} />
              <EuiResizablePanel
                id="session-detail-panel"
                initialSize={30}
                minSize="320px"
                paddingSize="none"
                css={styles.detailPanel}
              >
                <SessionViewDetailPanel
                  alerts={alerts}
                  alertsCount={alertsCount}
                  isFetchingAlerts={isFetchingAlerts}
                  hasNextPageAlerts={hasNextPageAlerts}
                  fetchNextPageAlerts={fetchNextPageAlerts}
                  investigatedAlertId={investigatedAlertId}
                  selectedProcess={selectedProcess}
                  onJumpToEvent={onJumpToEvent}
                  onShowAlertDetails={onShowAlertDetails}
                />
              </EuiResizablePanel>
            </>
          );
        }}
      </EuiResizableContainer>
      {showTTY && (
        <TTYPlayer
          sessionEntityId={sessionEntityId}
          onClose={onToggleTTY}
          isFullscreen={isFullScreen}
        />
      )}
    </div>
  );
};
// eslint-disable-next-line import/no-default-export
export { SessionView as default };
