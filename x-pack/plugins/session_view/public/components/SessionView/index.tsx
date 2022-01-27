/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiSplitPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SectionLoading } from '../../shared_imports';
import { ProcessTree } from '../ProcessTree';
import { Process, ProcessEvent } from '../../../common/types/process_tree';
import { SessionViewDetailPanel } from '../SessionViewDetailPanel';
import { SessionViewSearchBar } from '../SessionViewSearchBar';
import { useStyles } from './styles';
import { useFetchSessionViewProcessEvents } from './hooks';

interface SessionViewDeps {
  // the root node of the process tree to render. e.g process.entry.entity_id or process.session_leader.entity_id
  sessionEntityId: string;
  height?: number;
  jumpToEvent?: ProcessEvent;
}

/**
 * The main wrapper component for the session view.
 */
export const SessionView = ({ sessionEntityId, height, jumpToEvent }: SessionViewDeps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailMounted, setIsDetailMounted] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  const styles = useStyles({ height });

  const onProcessSelected = (process: Process) => {
    if (selectedProcess !== process) {
      setSelectedProcess(process);
    }
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

  const hasData = data && data.pages.length > 0 && data.pages[0].events.length > 0;
  const renderNoData = () => {
    return (
      <EuiEmptyPrompt
        data-test-subj="sessionViewProcessEventsEmpty"
        title={<h2>No data to render</h2>}
        body={<p>No process events found for this query.</p>}
      />
    );
  };

  const renderProcessTree = () => {
    // we only show this loader on initial load
    // otherwise as more pages are loaded it renders to full component
    if (isFetching && !data) {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.sessionView.loadingProcessTree"
            defaultMessage="Loading session…"
          />
        </SectionLoading>
      );
    }
    if (error) {
      return (
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          title={<h2>Error loading Session View</h2>}
          body={<p>There was an error loading the Session View.</p>}
        />
      );
    }
    if (hasData) {
      return (
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
          />
        </div>
      );
    }
  };

  const renderSessionViewDetailPanel = () => {
    if (isDetailOpen) {
      return (
        <SessionViewDetailPanel
          data-test-subj="detailsPanel"
          isDetailMounted={isDetailMounted}
          height={height}
          selectedProcess={selectedProcess}
          setIsDetailOpen={setIsDetailOpen}
        />
      );
    }
  };

  const toggleDetailPanel = () => {
    setIsDetailMounted(!isDetailMounted);
    if (!isDetailOpen) {
      setIsDetailOpen(true);
    }
  };

  if (!isFetching && !hasData) {
    return renderNoData();
  }

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="sessionViewProcessEventsSearch" css={{ position: 'relative' }}>
          <SessionViewSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setSelectedProcess={setSelectedProcess}
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
      <EuiSplitPanel.Outer
        direction="row"
        color="transparent"
        borderRadius="none"
        css={styles.outerPanel}
      >
        <EuiSplitPanel.Inner paddingSize="none" css={styles.treePanel}>
          {renderProcessTree()}
        </EuiSplitPanel.Inner>
        {renderSessionViewDetailPanel()}
      </EuiSplitPanel.Outer>
    </>
  );
};
