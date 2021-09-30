/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import { DataPanel } from '../../data_panel';

import { IgnoredSuggestionsTable } from '../components';
import { IgnoredQuery } from '../components/ignored_suggestions_table';

interface Props {}

export const CurationsHistory: React.FC<Props> = () => {
  const ignoredQueries: IgnoredQuery[] = [
    {
      label: 'landrover defender',
      suggestionId: '13245-0jk34t-890j34',
      onClick: (item: string) => alert(item),
    },
    {
      label: 'toyota land cruiser',
      suggestionId: '13245-0jk34t-890z34',
      onClick: (item: string) => alert(item),
    },
    {
      label: 'porsche 944 turbo',
      suggestionId: '13245-0jk34t-890a34',
      onClick: (item: string) => alert(item),
    },
    {
      label: 'lamborghini countache',
      suggestionId: '13245-0jk34t-890434',
      onClick: (item: string) => alert(item),
    },
  ];
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={2}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <DataPanel
              title={<h2>Automated curation changes</h2>}
              subtitle={<span>A detailed log of recent changes to your automated curations</span>}
              iconType="visTable"
              hasBorder
            >
              Embedded logs view goes here...
            </DataPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <DataPanel
              title={<h2>Rececntly rejected sugggestions</h2>}
              subtitle={
                <span>Recent suggestions that are still valid can be re-enabled from here</span>
              }
              iconType="crossInACircleFilled"
              hasBorder
            >
              Embedded logs view goes here...
            </DataPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <DataPanel
          title={<h2>Ignored queries</h2>}
          subtitle={<span>You won’t be notified about suggestions for these queries</span>}
          iconType="eyeClosed"
          hasBorder
        >
          <IgnoredSuggestionsTable queries={ignoredQueries} />
        </DataPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
