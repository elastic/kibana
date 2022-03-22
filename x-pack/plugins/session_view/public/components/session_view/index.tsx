/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiPanel,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SectionLoading } from '../../shared_imports';
import { ProcessTree } from '../process_tree';
import { AlertStatusEventEntityIdMap, Process } from '../../../common/types/process_tree';
import { DisplayOptionsState } from '../../../common/types/session_view';
import { SessionViewDeps } from '../../types';
import { SessionViewDetailPanel } from '../session_view_detail_panel';
import { SessionViewSearchBar } from '../session_view_search_bar';
import { SessionViewDisplayOptions } from '../session_view_display_options';
import { useStyles } from './styles';
import { useFetchAlertStatus, useFetchSessionViewProcessEvents } from './hooks';

/**
 * The main wrapper component for the session view.
 */
export const SessionView = ({
  sessionEntityId,
  height,
  jumpToEvent,
  loadAlertDetails,
}: SessionViewDeps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Process[] | null>(null);
  const [displayOptions, setDisplayOptions] = useState<DisplayOptionsState>({
    timestamp: true,
    verboseMode: true,
  });
  const [fetchAlertStatus, setFetchAlertStatus] = useState<string[]>([]);
  const [updatedAlertsStatus, setUpdatedAlertsStatus] = useState<AlertStatusEventEntityIdMap>({});

  const styles = useStyles({ height });

  const onProcessSelected = useCallback((process: Process | null) => {
    setSelectedProcess(process);
  }, []);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    fetchPreviousPage,
    hasPreviousPage,
  } = useFetchSessionViewProcessEvents(sessionEntityId, jumpToEvent);

  const hasData = data && data.pages.length > 0 && data.pages[0].events.length > 0;
  const renderIsLoading = isFetching && !data;
  const renderDetails = isDetailOpen && selectedProcess;
  const { data: newUpdatedAlertsStatus } = useFetchAlertStatus(
    updatedAlertsStatus,
    fetchAlertStatus[0] ?? ''
  );

  useEffect(() => {
    if (fetchAlertStatus) {
      setUpdatedAlertsStatus({ ...newUpdatedAlertsStatus });
    }
  }, [fetchAlertStatus, newUpdatedAlertsStatus]);

  const handleOnAlertDetailsClosed = useCallback((alertUuid: string) => {
    setFetchAlertStatus([alertUuid]);
  }, []);

  const toggleDetailPanel = useCallback(() => {
    setIsDetailOpen(!isDetailOpen);
  }, [isDetailOpen]);

  const handleOptionChange = useCallback((checkedOptions: DisplayOptionsState) => {
    setDisplayOptions(checkedOptions);
  }, []);

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
      <EuiPanel color={'subdued'}>
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
              displayOptions={displayOptions}
              onChange={handleOptionChange}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false} css={styles.buttonsEyeDetail}>
            <EuiButton
              onClick={toggleDetailPanel}
              iconType="list"
              data-test-subj="sessionView:sessionViewDetailPanelToggle"
            >
              <FormattedMessage
                id="xpack.sessionView.buttonOpenDetailPanel"
                defaultMessage="Detail panel"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiResizableContainer>
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              initialSize={isDetailOpen ? 70 : 100}
              minSize="600px"
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

              {error && (
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
                    sessionEntityId={sessionEntityId}
                    data={data.pages}
                    searchQuery={searchQuery}
                    selectedProcess={selectedProcess}
                    onProcessSelected={onProcessSelected}
                    jumpToEvent={jumpToEvent}
                    isFetching={isFetching}
                    hasPreviousPage={hasPreviousPage}
                    hasNextPage={hasNextPage}
                    fetchNextPage={fetchNextPage}
                    fetchPreviousPage={fetchPreviousPage}
                    setSearchResults={setSearchResults}
                    updatedAlertsStatus={updatedAlertsStatus}
                    loadAlertDetails={loadAlertDetails}
                    handleOnAlertDetailsClosed={handleOnAlertDetailsClosed}
                    timeStampOn={displayOptions.timestamp}
                    verboseModeOn={displayOptions.verboseMode}
                  />
                </div>
              )}
            </EuiResizablePanel>

            {renderDetails ? (
              <>
                <EuiResizableButton />
                <EuiResizablePanel
                  id="session-detail-panel"
                  initialSize={30}
                  minSize="200px"
                  paddingSize="none"
                  css={styles.detailPanel}
                >
                  <SessionViewDetailPanel
                    selectedProcess={selectedProcess}
                    onProcessSelected={onProcessSelected}
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
    </>
  );
};
// eslint-disable-next-line import/no-default-export
export { SessionView as default };
