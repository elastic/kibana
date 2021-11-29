/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiSearchBar,
  EuiEmptyPrompt,
  EuiButton,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { SectionLoading } from '../../shared_imports';
import { ProcessTree } from '../ProcessTree';
import { Process } from '../../hooks/use_process_tree';
import { SessionViewDetailPanel } from '../SessionViewDetailPanel';
import { useStyles } from './styles';
import {
  useSearchQuery,
  useFetchSessionViewProcessEvents,
  useParseSessionViewProcessEvents,
} from './hooks';

interface SessionViewDeps {
  // the root node of the process tree to render. e.g process.entry.entity_id or process.session.entity_id
  sessionEntityId: string;
  height?: number;
}

/**
 * The main wrapper component for the session view.
 * TODO:
 * - Details panel
 * - Fullscreen toggle
 * - Search results navigation
 * - Settings menu (needs design)
 */
export const SessionView = ({ sessionEntityId, height }: SessionViewDeps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailMounted, setIsDetailMounted] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  const styles = useStyles({ height });

  const onProcessSelected = (process: Process) => {
    if (selectedProcess !== process) {
      setSelectedProcess(process);
    }
  };

  const { onSearch, searchQuery } = useSearchQuery();
  const { isLoading, isError, data: getData } = useFetchSessionViewProcessEvents(sessionEntityId);
  const { data } = useParseSessionViewProcessEvents(getData);

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
    if (isLoading) {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.sessionView.loadingProcessTree"
            defaultMessage="Loading session…"
          />
        </SectionLoading>
      );
    }
    if (isError) {
      return (
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          title={<h2>Error loading Session View</h2>}
          body={<p>There was an error loading the Session View.</p>}
        />
      );
    }
    if (data) {
      return (
        <div css={styles.processTree}>
          <ProcessTree
            sessionEntityId={sessionEntityId}
            forward={data}
            searchQuery={searchQuery}
            selectedProcess={selectedProcess}
            onProcessSelected={onProcessSelected}
          />
        </div>
      );
    }
  };

  const renderSessionViewDetailPanel = () => {
    if (isDetailOpen) {
      return (
        <SessionViewDetailPanel
          isDetailMounted={isDetailMounted}
          height={height}
          selectedProcess={selectedProcess}
          setIsDetailOpen={setIsDetailOpen}
          session={data?.[0]?.process.session}
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

  if (!(isLoading || isError || data.length)) {
    return renderNoData();
  }

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="sessionViewProcessEventsSearch">
          <EuiSearchBar query={searchQuery} onChange={onSearch} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={toggleDetailPanel} iconType="list" fill>
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
