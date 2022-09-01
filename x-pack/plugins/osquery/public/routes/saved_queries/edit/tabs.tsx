/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiNotificationBadge } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { useGetUserCasesPermissions } from '../../../cases/useGetCasesPermissions';
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
  const casePermissions = useGetUserCasesPermissions();
  const CasesContext = cases!.ui.getCasesContext();

  const addToCaseButton = useCallback(
    () => <AddToCaseButton actionId={actionId} agentIds={agentIds} />,
    [actionId, agentIds]
  );

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
            addToCase={addToCaseButton}
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
    [
      actionId,
      agentIds,
      ecsMapping,
      startDate,
      endDate,
      addToTimeline,
      addToCaseButton,
      failedAgentsCount,
    ]
  );

  const casesOwner = useMemo(() => [SECURITY_SOLUTION_OWNER], []);

  return (
    <CasesContext owner={casesOwner} permissions={casePermissions}>
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
