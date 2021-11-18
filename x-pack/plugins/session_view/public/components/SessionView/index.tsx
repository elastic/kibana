/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import MonacoEditor from 'react-monaco-editor';
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
  EuiTabs,
  EuiTab,
  EuiAccordion,
} from '@elastic/eui';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { ProcessTree } from '../ProcessTree';
import { Process, ProcessEvent } from '../../hooks/use_process_tree';
import { useStyles } from './styles';
import { PROCESS_EVENTS_ROUTE } from '../../../common/constants';
import { flattenJSON } from '../../../common/utils/flatten_json';

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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailMounted, setIsDetailMounted] = useState(false);
  const [selectedDetailTab, setSelectedDetailTab] = useState('tree');
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
          sessionEntityId,
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

  const detailPanelTabs = [
    {
      id: 'tree',
      name: 'Tree view',
      content: (
        <>
          {selectedProcess && (
            <>
              <EuiTitle size="s">
                <span>Command Detail</span>
              </EuiTitle>
              <EuiSpacer />
              {selectedProcess.events.map((event) => {
                const flattenedSelectedProcess = flattenJSON(event);
                return (
                  <EuiAccordion
                    id={flattenedSelectedProcess['event.action']}
                    buttonContent={flattenedSelectedProcess['event.action']}
                  >
                    <EuiDescriptionList
                      type="column"
                      compressed
                      listItems={Object.keys(flattenedSelectedProcess).map((title) => ({
                        title,
                        description: flattenedSelectedProcess[title],
                      }))}
                    />
                    <EuiSpacer />
                  </EuiAccordion>
                );
              })}
              <EuiSpacer size="xxl" />
            </>
          )}
          <EuiTitle size="s">
            <span>Session Detail</span>
          </EuiTitle>
          <EuiSpacer />
          {(() => {
            const flattenedSession = flattenJSON(data?.[0]?.process.session);
            return (
              <EuiDescriptionList
                type="column"
                compressed
                listItems={Object.keys(flattenedSession).map((title) => ({
                  title,
                  description: flattenedSession[title],
                }))}
              />
            );
          })()}
          <EuiSpacer size="xxl" />
          <EuiTitle size="s">
            <span>Server Detail</span>
          </EuiTitle>
          {/* Add server detail */}
          <EuiSpacer size="xxl" />
          <EuiTitle size="s">
            <span>Alert Detail</span>
          </EuiTitle>
          {/* Add alert detail conditionally */}
        </>
      ),
    },
    {
      id: 'json',
      name: 'JSON view',
      content: (
        <>
          {selectedProcess && (
            <>
              <EuiTitle size="s">
                <span>Command Detail</span>
              </EuiTitle>
              <EuiSpacer />
              <MonacoEditor
                height={400}
                language="javascript"
                options={{
                  lineNumbers: 'on',
                  language: 'json',
                  readOnly: true,
                }}
                value={JSON.stringify(selectedProcess?.events || {}, null, 4)}
              />
              <EuiSpacer size="xxl" />
            </>
          )}
          <EuiTitle size="s">
            <span>Session Detail</span>
          </EuiTitle>
          <EuiSpacer />
          <MonacoEditor
            height={400}
            language="javascript"
            options={{
              lineNumbers: 'on',
              language: 'json',
              readOnly: true,
            }}
            value={JSON.stringify(data?.[0]?.process.session || {}, null, 4)}
          />
          <EuiSpacer size="xxl" />
          <EuiTitle size="s">
            <span>Server Detail</span>
          </EuiTitle>
          {/* Add server detail */}
          <EuiSpacer size="xxl" />
          <EuiTitle size="s">
            <span>Alert Detail</span>
          </EuiTitle>
          {/* Add alert detail conditionally */}
        </>
      ),
    },
  ];

  if (!data.length) {
    return renderNoData();
  }

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
      <EuiSplitPanel.Outer
        direction="row"
        color="transparent"
        borderRadius="none"
        css={styles.outerPanel}
      >
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
            <EuiTabs>
              {detailPanelTabs.map((tab, idx) => (
                <EuiTab
                  key={idx}
                  onClick={() => setSelectedDetailTab(tab.id)}
                  isSelected={tab.id === selectedDetailTab}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
            <EuiSpacer size="xxl" />
            {detailPanelTabs.find((obj) => obj.id === selectedDetailTab)?.content}
          </EuiSplitPanel.Inner>
        )}
      </EuiSplitPanel.Outer>
    </>
  );
};
