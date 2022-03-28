/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { ResultsTable } from '../../../results/results_table';
import { ActionResultsSummary } from '../../../action_results/action_results_summary';
import { ActionAgentsStatus } from '../../../action_results/action_agents_status';

interface ResultTabsProps {
  actionId: string;
  agentIds?: string[];
  startDate?: string;
  endDate?: string;
  addToTimeline?: (actionId: string) => void;
}

const ResultTabsComponent: React.FC<ResultTabsProps> = ({
  actionId,
  agentIds,
  endDate,
  startDate,
  addToTimeline,
}) => {
  const tabs = useMemo(
    () => [
      {
        id: 'results',
        name: 'Results',
        content: (
          <>
            <EuiSpacer />
            <ResultsTable
              actionId={actionId}
              agentIds={agentIds}
              startDate={startDate}
              endDate={endDate}
              addToTimeline={addToTimeline}
            />
          </>
        ),
      },
      {
        id: 'status',
        name: 'Status',
        content: (
          <>
            <EuiSpacer />
            <ActionResultsSummary
              actionId={actionId}
              agentIds={agentIds}
              expirationDate={endDate}
            />
          </>
        ),
      },
    ],
    [actionId, agentIds, endDate, startDate, addToTimeline]
  );

  return (
    <>
      <ActionAgentsStatus actionId={actionId} agentIds={agentIds} expirationDate={endDate} />
      <EuiSpacer size="s" />
      <EuiTabbedContent
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        autoFocus="selected"
        expand={false}
      />
    </>
  );
};

export const ResultTabs = React.memo(ResultTabsComponent);
