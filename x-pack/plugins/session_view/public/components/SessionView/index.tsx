/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { useQuery, useMutation } from 'react-query';
import {
  EuiSearchBar,
  EuiSearchBarOnChangeArgs,
  EuiButton,
  EuiDescriptionList,
  EuiPage,
  EuiPageContent,
  EuiPageHeader,
  EuiSpacer,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiTitle,
} from '@elastic/eui';
import { ProcessTree } from '../ProcessTree';
import { getStart, getEnd, getEvent } from '../../../common/test/mock_data';
import { Process, ProcessEvent } from '../../hooks/use_process_tree';
import { useStyles } from './styles';

import {
  INTERNAL_TEST_ROUTE,
} from '../../../common/constants';

interface SessionViewDeps {
  sessionId: string;
}

interface MockESReturnData {
  hits: any[]
  length: number
}

/**
 * The main wrapper component for the session view.
 * Currently has mock data and only renders the process_tree component
 * TODO:
 * - React query, fetching and paging events by sessionId
 * - Details panel
 * - Fullscreen toggle
 * - Search results navigation
 * - Settings menu (needs design)
 */
export const SessionView = ({ sessionId }: SessionViewDeps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const styles = useStyles();

  const { http } = useKibana<CoreStart>().services;

  const processTreeCSS = `
    height: 300px;
  `;

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

  const {
    mutate
  } = useMutation((insertData) => {
    return http.put(INTERNAL_TEST_ROUTE, { 
      body: JSON.stringify({ 
        index: 'process_tree',
        data: JSON.stringify(insertData)
      })
    });
  });

  const {
    data: getData
  } = useQuery<MockESReturnData, Error>(['process-tree', 'process_tree'], () =>
    http.get<MockESReturnData>(INTERNAL_TEST_ROUTE, {
      query: {
        index: 'process_tree',
      },
    })
  );

  const {
    mutate: deleteMutate
  } = useMutation((insertData) => {
    return http.delete(INTERNAL_TEST_ROUTE, { 
      body: JSON.stringify({ 
        index: 'process_tree'
      })
    });
  });
  
  const handleMutate = (insertData: any) => {
    mutate(insertData, {
      onSuccess: () => {
        setData([...data, ...insertData])
      }
    });
  }

  const handleDelete = () => {
    deleteMutate(undefined, {
      onSuccess: () => {
        setData([]);
        setSelectedProcess(null);
      }
    })
  }

  useEffect(() => {
    if (!getData) {
      return;
    }

    if (getData.length <= data.length) {
      return;
    }

    setData(getData.hits.map((event: any) => event._source));
  }, [getData]);

  const renderNoData = () => {
    if (data.length) {
      return null;
    }
    return (
      <EuiEmptyPrompt 
        title={<h2>No data to render</h2>}
        body={
          <p>
            Please start by adding some data using the bottons below
          </p>
        }
      />
    )
  };

  const toggleDetailPanel = () => {
    console.log('jack', data)
    setIsDetailOpen(!isDetailOpen);
  };

  const renderInsertButtons = () => {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem>
          <EuiButton onClick={() => handleMutate(getStart())}>
            Insert Session Start
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={() => handleMutate(getEvent())}>
            Insert Command
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={() => handleMutate(getEnd())}>
            Insert End
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={handleDelete}>
            Delete Data
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    )
  }

  return (
    <EuiPage>
      <EuiPageContent>
        <EuiPageHeader 
          pageTitle="Process Tree"
          iconType="logoKibana"
          description={
            `Below is an example of the process tree, demonstrating data fetching patterns and data rendering.
            Please start by adding some mock data
            `
          }
        />
        <EuiSpacer />
        {renderNoData()}
        {!!data.length &&
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
              <div css={processTreeCSS}>
                <ProcessTree
                  sessionId={sessionId}
                  forward={data}
                  searchQuery={searchQuery}
                  selectedProcess={selectedProcess}
                  onProcessSelected={onProcessSelected}
                />
              </div>
              </EuiSplitPanel.Inner>
              {isDetailOpen && (
                <EuiSplitPanel.Inner paddingSize="s" css={styles.detailPanel}>
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
        }
        <EuiSpacer />
        {renderInsertButtons()}
      </EuiPageContent>
    </EuiPage>
  );
};
