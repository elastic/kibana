/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiFlexItem,
  EuiResizableContainer,
  EuiPanel,
  EuiHorizontalRule,
  EuiFlexGroup,
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
import { useStyles } from './styles';
import {
  useFetchAlertStatus,
  useFetchSessionViewProcessEvents,
  useFetchSessionViewAlerts,
} from './hooks';
import { LOCAL_STORAGE_DISPLAY_OPTIONS_KEY } from '../../../common/constants';

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

  // to give an indication to the user that there may be more search results if they turn on verbose mode.
  const showVerboseSearchTooltip = useMemo(() => {
    return !!(!displayOptions?.verboseMode && searchQuery && searchResults?.length === 0);
  }, [displayOptions?.verboseMode, searchResults, searchQuery]);

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
  } = useFetchSessionViewProcessEvents(sessionEntityId, currentJumpToCursor);

  const alertsQuery = useFetchSessionViewAlerts(sessionEntityId);
  const { data: alerts, error: alertsError, isFetching: alertsFetching } = alertsQuery;

  const hasData = alerts && data && data.pages?.[0].events.length > 0;
  const hasError = error || alertsError;
  const renderIsLoading = (isFetching || alertsFetching) && !data;
  const renderDetails = isDetailOpen && selectedProcess;
  const { data: newUpdatedAlertsStatus } = useFetchAlertStatus(
    updatedAlertsStatus,
    fetchAlertStatus[0] ?? ''
  );

  useEffect(() => {
    if (newUpdatedAlertsStatus) {
      setUpdatedAlertsStatus({ ...newUpdatedAlertsStatus });
      // clearing alertUuids fetched without triggering a re-render
      fetchAlertStatus.shift();
    }
  }, [newUpdatedAlertsStatus, fetchAlertStatus]);

  const handleOnAlertDetailsClosed = useCallback((alertUuid: string) => {
    setFetchAlertStatus([alertUuid]);
  }, []);

  const toggleDetailPanel = useCallback(() => {
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

  if (!isFetching && !hasData) {
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
    <>
      <div css={styles.sessionViewerComponent}>
        <EuiPanel css={styles.toolBar} hasShadow={false} borderRadius="none">
          <EuiFlexGroup>
            <EuiFlexItem
              data-test-subj="sessionView:sessionViewProcessEventsSearch"
              css={styles.searchBar}
            >
              <SessionViewSearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onProcessSelected={onProcessSelected}
                searchResults={searchResults}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false} css={styles.buttonsEyeDetail}>
              <SessionViewDisplayOptions
                displayOptions={displayOptions!}
                onChange={handleOptionChange}
                showVerboseSearchTooltip={showVerboseSearchTooltip}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false} css={styles.buttonsEyeDetail}>
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
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel
                initialSize={isDetailOpen ? 75 : 100}
                minSize="60%"
                paddingSize="none"
              >
                {renderIsLoading && (
                  <SectionLoading>
                    <FormattedMessage
                      id="xpack.sessionView.loadingProcessTree"
                      defaultMessage="Loading session…"
                    />
                  </SectionLoading>
                )}

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
                      alerts={alerts}
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

              {renderDetails ? (
                <>
                  <EuiResizableButton css={styles.resizeHandle} />
                  <EuiResizablePanel
                    id="session-detail-panel"
                    initialSize={25}
                    minSize="320px"
                    paddingSize="none"
                    css={styles.detailPanel}
                  >
                    <SessionViewDetailPanel
                      alerts={alerts}
                      investigatedAlertId={investigatedAlertId}
                      selectedProcess={selectedProcess}
                      onJumpToEvent={onJumpToEvent}
                      onShowAlertDetails={onShowAlertDetails}
                    />
                  </EuiResizablePanel>
                </>
              ) : (
                <>
                  {/* Returning an empty element here (instead of false) to avoid a bug in EuiResizableContainer */}
                </>
              )}
            </>
          )}
        </EuiResizableContainer>
      </div>
    </>
  );
};
// eslint-disable-next-line import/no-default-export
export { SessionView as default };
