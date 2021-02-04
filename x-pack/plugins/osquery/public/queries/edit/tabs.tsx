/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { ResultsTable } from '../../results/results_table';
import { ActionResultsTable } from '../../action_results/action_results_table';

const ResultTabsComponent = ({ actionId }: { actionId: string }) => {
  const tabs = useMemo(
    () => [
      {
        id: 'status',
        name: 'Status',
        content: (
          <>
            <EuiSpacer />
            <ActionResultsTable actionId={actionId} />
          </>
        ),
      },
      {
        id: 'results',
        name: 'Results',
        content: (
          <>
            <EuiSpacer />
            <ResultsTable actionId={actionId} />
          </>
        ),
      },
    ],
    [actionId]
  );

  return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />;
};

export const ResultTabs = React.memo(ResultTabsComponent);
