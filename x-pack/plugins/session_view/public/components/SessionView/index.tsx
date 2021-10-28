/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import ProcessTree from '../ProcessTree';
import mockData from '../../../common/test/mock_data';
import { IProcess } from '../../hooks/use_process_tree';
import { EuiSearchBar, EuiSearchBarOnChangeArgs } from '@elastic/eui';

interface ISessionViewDeps {
  sessionId: string;
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
const SessionView = ({ sessionId }: ISessionViewDeps) => {
  const [query, setQuery] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<IProcess | null>(null);

  const processTreeCSS = `
    height: 300px;
  `;

  const onProcessSelected = (process: IProcess) => {
    if (selectedProcess !== process) {
      setSelectedProcess(process);
    }
  };

  const onSearch = ({ query }: EuiSearchBarOnChangeArgs) => {
    if (query) {
      setQuery(query.text);
    } else {
      setQuery('');
    }
  };

  return (
    <>
      <EuiSearchBar query={query} onChange={onSearch} />
      <div css={processTreeCSS}>
        <ProcessTree
          sessionId={sessionId}
          forward={mockData}
          searchQuery={query}
          selectedProcess={selectedProcess}
          onProcessSelected={onProcessSelected}
        />
      </div>
    </>
  );
};

export default SessionView;
