/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { Direction } from '../../../common/search_strategy';
import { OsqueryResult } from './osquery_result';
import { useAllLiveQueries } from '../../actions/use_all_live_queries';
import type { OsqueryActionResultsWithIds } from './types';

export const OsqueryResultsWithQuery: React.FC<OsqueryActionResultsWithIds> = ({
  agentIds,
  ruleName,
  ecsData,
  alertId,
  actionId,
}) => {
  const { data: actionsData } = useAllLiveQueries({
    alertId,
    actionId,
    activePage: 0,
    limit: 100,
    direction: Direction.desc,
    sortField: '@timestamp',
  });

  return (
    <div data-test-subj={'osquery-results'}>
      {actionsData?.data.items.map((item, index) => {
        const actionIndex = item.fields?.action_id?.[0];
        const startDate = item.fields?.['@timestamp'][0];

        return (
          <OsqueryResult
            key={actionIndex + index}
            actionId={actionIndex}
            startDate={startDate}
            ruleName={ruleName}
            agentIds={agentIds}
            ecsData={ecsData}
          />
        );
      })}
      <EuiSpacer size="s" />
    </div>
  );
};
