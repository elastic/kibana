/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiSearchBar, EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { ProcessTree } from '../ProcessTree';
import { mockData } from '../../../common/test/mock_data';
import { Process } from '../../hooks/use_process_tree';

interface SessionViewDeps {
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
export const SessionView = ({ sessionId }: SessionViewDeps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

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

  return (
    <div>
      <EuiSearchBar query={searchQuery} onChange={onSearch} />
      <div css={processTreeCSS}>
        <ProcessTree
          sessionId={sessionId}
          forward={mockData}
          searchQuery={searchQuery}
          selectedProcess={selectedProcess}
          onProcessSelected={onProcessSelected}
        />
      </div>
    </div>
  );
};
