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

const testSearchQuery = 'me/k';

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
 * - Search within terminal (just input and state)
 *   Search logic and highlighting will be handled by use_process_tree.ts and process.tsx
 * - Settings menu (needs design)
 */
const SessionView = ({ sessionId }: ISessionViewDeps) => {
  const [searchQuery] = useState(testSearchQuery);
  const [selectedProcess, setSelectedProcess] = useState<IProcess | null>(null);

  const sessionViewCSS = `
    height: 300px;
  `;

  const onProcessSelected = (process: IProcess) => {
    if (selectedProcess !== process) {
      setSelectedProcess(process);
    }
  };

  return (
    <div css={sessionViewCSS}>
      <ProcessTree
        sessionId={sessionId}
        forward={mockData}
        searchQuery={searchQuery}
        selectedProcess={selectedProcess}
        onProcessSelected={onProcessSelected}
      />
    </div>
  );
};

export default SessionView;
