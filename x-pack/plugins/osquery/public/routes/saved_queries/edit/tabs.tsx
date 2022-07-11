/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { AddToCaseButton } from '../../../cases/AddToCasesButton';
import { useKibana } from '../../../common/lib/kibana';
import { ResultsTable } from '../../../results/results_table';
import { ActionResultsSummary } from '../../../action_results/action_results_summary';
import { ActionAgentsStatus } from '../../../action_results/action_agents_status';

interface ResultTabsProps {
  actionId: string;
  agentIds?: string[];
  startDate?: string;
  endDate?: string;
  addToTimeline?: (payload: { query: [string, string]; isIcon?: true }) => React.ReactElement;
}

const ResultTabsComponent: React.FC<ResultTabsProps> = ({
  actionId,
  agentIds,
  endDate,
  startDate,
  addToTimeline,
}) => {
  const { cases } = useKibana().services;
  const CasesContext = cases!.ui.getCasesContext();

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
              addToCase={() => <AddToCaseButton actionId={actionId} agentIds={agentIds} />}
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
    [actionId, agentIds, startDate, endDate, addToTimeline]
  );

  return (
    <CasesContext owner={['securitySolution']} permissions={{ all: true, read: true }}>
      <ActionAgentsStatus actionId={actionId} agentIds={agentIds} expirationDate={endDate} />
      <EuiSpacer size="s" />
      <EuiTabbedContent
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        autoFocus="selected"
        expand={false}
      />
    </CasesContext>
  );
};

export const ResultTabs = React.memo(ResultTabsComponent);
