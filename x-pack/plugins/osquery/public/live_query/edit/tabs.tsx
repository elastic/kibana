/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';

import { ResultsTable } from '../../results/results_table';
import { ActionResultsTable } from '../../action_results/action_results_table';

const ResultTabsComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const tabs = [
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
  ];

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      onTabClick={(tab) => {
        console.log('clicked tab', tab);
      }}
    />
  );
};

export const ResultTabs = React.memo(ResultTabsComponent);
