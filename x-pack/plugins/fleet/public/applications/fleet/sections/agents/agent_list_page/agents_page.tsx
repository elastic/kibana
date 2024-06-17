/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { AgentsGridView } from './components';

import { AgentListPage } from '.';

export const AgentsPage: React.FunctionComponent<{}> = () => {
  const [showDataGridView, setDataGridView] = useState(false);

  return (
    <>
      {!showDataGridView ? (
        <AgentListPage showDataGridView={showDataGridView} setDataGridView={setDataGridView} />
      ) : (
        <AgentsGridView showDataGridView={showDataGridView} setDataGridView={setDataGridView} />
      )}
    </>
  );
};
