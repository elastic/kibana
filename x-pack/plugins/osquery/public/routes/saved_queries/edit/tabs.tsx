/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiNotificationBadge } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { ReactElement } from 'react';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { useKibana } from '../../../common/lib/kibana';
import { useGetUserCasesPermissions } from '../../../cases/use_get_cases_permissions';

import type { AddToTimelinePayload } from '../../../timelines/use_add_to_timeline';
import type { ECSMapping } from '../../../../common/schemas/common';
import { ResultsTable } from '../../../results/results_table';
import { ActionResultsSummary } from '../../../action_results/action_results_summary';

interface ResultTabsProps {
  actionId: string;
  agentIds?: string[];
  startDate?: string;
  ecsMapping?: ECSMapping;
  failedAgentsCount?: number;
  endDate?: string;
  addToTimeline?: (payload: AddToTimelinePayload) => ReactElement;
  addToCase?: ({ actionId }: { actionId?: string }) => ReactElement;
}

const ResultTabsComponent: React.FC<ResultTabsProps> = ({
  actionId,
  agentIds,
  ecsMapping,
  endDate,
  failedAgentsCount,
  startDate,
  addToTimeline,
  addToCase,
}) => {
  const { cases } = useKibana().services;
  const casePermissions = useGetUserCasesPermissions();
  const CasesContext = cases.ui.getCasesContext();

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
            addToCase={addToCase}
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
      addToCase,
      failedAgentsCount,
    ]
  );
  const casesOwner = useMemo(() => [SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER], []);

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
