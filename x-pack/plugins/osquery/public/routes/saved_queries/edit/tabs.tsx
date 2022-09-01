/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiNotificationBadge } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { ReactElement } from 'react';

import type { ECSMapping } from '../../../../common/schemas/common';
import { AddToCaseButton } from '../../../cases/AddToCasesButton';
import { useKibana } from '../../../common/lib/kibana';
import { ResultsTable } from '../../../results/results_table';
import { ActionResultsSummary } from '../../../action_results/action_results_summary';

interface ResultTabsProps {
  actionId: string;
  agentIds?: string[];
  startDate?: string;
  ecsMapping?: ECSMapping;
  failedAgentsCount?: number;
  endDate?: string;
  addToTimeline?: (payload: { query: [string, string]; isIcon?: true }) => ReactElement;
}

const ResultTabsComponent: React.FC<ResultTabsProps> = ({
  actionId,
  agentIds,
  ecsMapping,
  endDate,
  failedAgentsCount,
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
          <ResultsTable
            actionId={actionId}
            agentIds={agentIds}
            ecsMapping={ecsMapping}
            startDate={startDate}
            endDate={endDate}
            addToTimeline={addToTimeline}
            addToCase={() => <AddToCaseButton actionId={actionId} agentIds={agentIds} />}

          />
        ),
      },
      {
        id: 'status',
        name: 'Status',
        content: (
          <ActionResultsSummary actionId={actionId} agentIds={agentIds} expirationDate={endDate} />
        ),
        append: failedAgentsCount ? (
          <EuiNotificationBadge className="eui-alignCenter" size="m">
            {failedAgentsCount}
          </EuiNotificationBadge>
        ) : null,
      },
    ],
    [actionId, agentIds, ecsMapping, startDate, endDate, addToTimeline, failedAgentsCount]
  );

  return (
    <CasesContext owner={['securitySolution']} permissions={{ all: true, read: true }}>

    <EuiTabbedContent
      // TODO: extend the EuiTabbedContent component to support EuiTabs props
      // bottomBorder={false}
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      expand={false}
    />
    </CasesContext>

  );
};

export const ResultTabs = React.memo(ResultTabsComponent);
