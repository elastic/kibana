/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { ResultsTable } from '../../results/results_table';
import { ActionResultsSummary } from '../../action_results/action_results_summary';

interface ResultTabsProps {
  actionId: string;
  agentIds?: string[];
  isLive?: boolean;
  startDate?: string;
  endDate?: string;
}

const ResultTabsComponent: React.FC<ResultTabsProps> = ({
  actionId,
  agentIds,
  endDate,
  isLive,
  startDate,
}) => {
  const tabs = useMemo(
    () => [
      {
        id: 'status',
        name: 'Status',
        content: (
          <>
            <EuiSpacer />
            <ActionResultsSummary actionId={actionId} agentIds={agentIds} isLive={isLive} />
          </>
        ),
      },
      {
        id: 'results',
        name: 'Results',
        content: (
          <>
            <EuiSpacer />
            <ResultsTable
              actionId={actionId}
              agentIds={agentIds}
              isLive={isLive}
              startDate={startDate}
              endDate={endDate}
            />
          </>
        ),
      },
    ],
    [actionId, agentIds, endDate, isLive, startDate]
  );

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      expand={false}
    />
  );
};

export const ResultTabs = React.memo(ResultTabsComponent);
