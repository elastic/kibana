/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiNotificationBadge } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';

import styled from 'styled-components';
import { ResultsTable } from '../../../results/results_table';
import { ActionResultsSummary } from '../../../action_results/action_results_summary';

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  div.euiTabs {
    padding-left: 8px;
  }
`;

interface ResultTabsProps {
  actionId: string;
  agentIds?: string[];
  startDate?: string;
  ecsMapping?: ECSMapping;
  failedAgentsCount?: number;
  endDate?: string;
  liveQueryActionId?: string;
}

const ResultTabsComponent: React.FC<ResultTabsProps> = ({
  actionId,
  agentIds,
  ecsMapping,
  endDate,
  failedAgentsCount,
  startDate,
  liveQueryActionId,
}) => {
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
            liveQueryActionId={liveQueryActionId}
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
    [actionId, agentIds, ecsMapping, startDate, endDate, liveQueryActionId, failedAgentsCount]
  );

  return (
    <StyledEuiTabbedContent
      // TODO: extend the EuiTabbedContent component to support EuiTabs props
      // bottomBorder={false}
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      expand={false}
    />
  );
};

export const ResultTabs = React.memo(ResultTabsComponent);
