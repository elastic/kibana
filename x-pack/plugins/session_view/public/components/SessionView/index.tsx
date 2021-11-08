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
  EuiPage, 
  EuiPageContent,
  EuiPageHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt
} from '@elastic/eui';
import { ProcessTree } from '../ProcessTree';
import { getStart, getEnd, getEvent } from '../../../common/test/mock_data';
import { Process } from '../../hooks/use_process_tree';

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
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

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
  }

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
            <EuiSearchBar query={searchQuery} onChange={onSearch} />
            <div css={processTreeCSS}>
              <ProcessTree
                sessionId={sessionId}
                forward={data}
                searchQuery={searchQuery}
                selectedProcess={selectedProcess}
                onProcessSelected={onProcessSelected}
              />
            </div>  
          </>
        }
        <EuiSpacer />
        {renderInsertButtons()}
      </EuiPageContent>
    </EuiPage>
  );
};
