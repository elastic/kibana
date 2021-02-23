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

interface ResultTabsProps {
  actionId: string;
}

const ResultTabsComponent: React.FC<ResultTabsProps> = ({ actionId }) => {
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
      {
        id: 'results_discover',
        name: 'Results in Discover',
        href: `/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-24h,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'logs-*',key:action_id,negate:!f,params:(query:'${actionId}'),type:phrase),query:(match_phrase:(action_id:'${actionId}')))),index:'logs-*',interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))`,
        target: '_blank',
      },
    ],
    [actionId]
  );

  return (
    <EuiTabbedContent
      // @ts-expect-error update types
      tabs={tabs}
      // @ts-expect-error update types
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      expand={false}
    />
  );
};

export const ResultTabs = React.memo(ResultTabsComponent);
