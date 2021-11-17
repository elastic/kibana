/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  EuiSearchBar,
  EuiSearchBarOnChangeArgs,
  EuiEmptyPrompt,
  EuiButton,
  EuiDescriptionList,
  EuiSpacer,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { ProcessTree } from '../ProcessTree';
import { Process, ProcessEvent } from '../../hooks/use_process_tree';
import { useStyles } from './styles';
import { PROCESS_EVENTS_ROUTE } from '../../../common/constants';

interface SessionViewDeps {
  // the root node of the process tree to render. e.g process.entry.entity_id or process.session.entity_id
  sessionEntityId: string;
  height?: number;
}

interface ProcessEventResults {
  hits: any[];
  length: number;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isDetailMounted, setIsDetailMounted] = useState<boolean>(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  const { http } = useKibana<CoreStart>().services;

  const styles = useStyles({ height });

  const onProcessSelected = (process: Process) => {
    if (selectedProcess !== process) {
      setSelectedProcess(process);
    }
  };

  const onSearch = ({ query }: EuiSearchBarOnChangeArgs) => {
    if (query) {
      setSearchQuery(query.text);
    } else {
      setSearchQuery('');
    }
  };

  const { data: getData } = useQuery<ProcessEventResults, Error>(
    ['process-tree', 'process_tree'],
    () =>
      http.get<ProcessEventResults>(PROCESS_EVENTS_ROUTE, {
        query: {
          indexes: ['cmd*', '.siem-signals-*'],
          sessionEntityId
        },
      })
  );

  useEffect(() => {
    if (!getData) {
      return;
    }

    if (getData.length <= data.length) {
      return;
    }

    setData(getData.hits.map((event: any) => event._source as ProcessEvent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getData]);

  const renderNoData = () => {
    return (
      <EuiEmptyPrompt
        title={<h2>No data to render</h2>}
        body={<p>No process events found for this query.</p>}
      />
    );
  };

  const toggleDetailPanel = () => {
    setIsDetailMounted(!isDetailMounted);
    if (!isDetailOpen) setIsDetailOpen(true);
  };

  if (!data.length) {
    return renderNoData();
  }
console.log(selectedProcess)
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSearchBar query={searchQuery} onChange={onSearch} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={toggleDetailPanel} iconType="list" fill>
            Detail Panel
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSplitPanel.Outer direction="row" color="transparent" borderRadius="none" css={styles.outerPanel}>
        <EuiSplitPanel.Inner paddingSize="none" css={styles.treePanel}>
          <div css={styles.processTree}>
            <ProcessTree
              sessionEntityId={sessionEntityId}
              forward={data}
              searchQuery={searchQuery}
              selectedProcess={selectedProcess}
              onProcessSelected={onProcessSelected}
            />
          </div>
        </EuiSplitPanel.Inner>
        {isDetailOpen && (
          <EuiSplitPanel.Inner
            paddingSize="s"
            color="plain"
            css={isDetailMounted ? styles.detailPanelIn : styles.detailPanelOut}
            onAnimationEnd={() => {
              if (!isDetailMounted) setIsDetailOpen(false);
            }}
          >
            {selectedProcess && (
              <>
                <EuiTitle size="xs"><span>Command Detail</span></EuiTitle>
                <EuiSpacer />
                {selectedProcess.events.map((event) => {
                  return (<EuiDescriptionList
                    type="column"
                    compressed
                    listItems={Object.keys(event).map((title) => ({
                      title,
                      description: JSON.stringify(event[title as keyof ProcessEvent], null, 4),
                    }))}
                  />)
                })}
                <EuiSpacer size="xxl"/>
              </>
            )}

            <EuiTitle size="xs"><span>Session Detail</span></EuiTitle>
            <EuiSpacer />
            <EuiDescriptionList
              type="column"
              compressed
              listItems={Object.keys(data?.[0].process.session).map((title) => ({
                title,
                description: JSON.stringify(data?.[0].process.session[title], null, 4),
              }))}
            />

            <EuiSpacer size="xxl"/>

            <EuiTitle size="xs"><span>Server Detail</span></EuiTitle>
            {/* Add server detail */}

            <EuiSpacer size="xxl"/>
            
            <EuiTitle size="xs"><span>Alert Detail</span></EuiTitle>
            {/* Add alert detail conditionally */}
          </EuiSplitPanel.Inner>
        )}
      </EuiSplitPanel.Outer>
    </>
  );
};
