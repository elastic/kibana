/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SectionLoading } from '../../shared_imports';
import { ProcessTree } from '../process_tree';
import { Process } from '../../../common/types/process_tree';
import { SessionViewDeps } from '../../types';
import { SessionViewDetailPanel } from '../session_view_detail_panel';
import { SessionViewSearchBar } from '../session_view_search_bar';
import { useStyles } from './styles';
import { useFetchSessionViewProcessEvents, useFetchSessionViewAlerts } from './hooks';

/**
 * The main wrapper component for the session view.
 */
export const SessionView = ({ sessionEntityId, height, jumpToEvent }: SessionViewDeps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  const styles = useStyles({ height });

  const onProcessSelected = useCallback((process: Process | null) => {
    setSelectedProcess(process);
  }, []);

  const onShowAlertDetails = useCallback((alertId: string) => {
    // TODO: hook into callback for alert flyout.
  }, []);

  const toggleDetailPanel = () => {
    setIsDetailOpen(!isDetailOpen);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Process[] | null>(null);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    fetchPreviousPage,
    hasPreviousPage,
  } = useFetchSessionViewProcessEvents(sessionEntityId, jumpToEvent);

  const alertsQuery = useFetchSessionViewAlerts(sessionEntityId);
  const { data: alerts, error: alertsError, isFetching: alertsFetching } = alertsQuery;

  const hasData = alerts && data && data.pages?.[0].events.length > 0;
  const hasError = error || alertsError;
  const renderIsLoading = (isFetching || alertsFetching) && !data;
  const renderDetails = isDetailOpen && selectedProcess;

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
      <EuiFlexGroup>
        <EuiFlexItem
          data-test-subj="sessionView:sessionViewProcessEventsSearch"
          css={{ position: 'relative' }}
        >
          <SessionViewSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onProcessSelected={onProcessSelected}
            searchResults={searchResults}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={toggleDetailPanel}
            iconType="list"
            fill
            data-test-subj="sessionViewDetailPanelToggle"
          >
            <FormattedMessage
              id="xpack.sessionView.buttonOpenDetailPanel"
              defaultMessage="Detail panel"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
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
                    sessionEntityId={sessionEntityId}
                    data={data.pages}
                    alerts={alerts}
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
                  />
                </div>
              )}
            </EuiResizablePanel>

            {renderDetails ? (
              <>
                <EuiResizableButton css={styles.resizeHandle} />
                <EuiResizablePanel
                  id="session-detail-panel"
                  initialSize={30}
                  minSize="200px"
                  paddingSize="none"
                  css={styles.detailPanel}
                >
                  <SessionViewDetailPanel
                    alerts={alerts}
                    investigatedAlert={jumpToEvent}
                    selectedProcess={selectedProcess}
                    onProcessSelected={onProcessSelected}
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
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { SessionView as default };
