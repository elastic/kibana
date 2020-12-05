/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat } from '@elastic/eui';

import { TOTAL_QUERIES, TOTAL_DOCUMENTS, TOTAL_CLICKS } from '../../analytics/constants';

import { EngineOverviewLogic } from '../';

export const TotalStats: React.FC = () => {
  const { totalQueries, documentCount, totalClicks } = useValues(EngineOverviewLogic);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiPanel data-test-subj="TotalQueriesCard">
          <EuiStat title={totalQueries} description={TOTAL_QUERIES} titleColor="primary" />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel data-test-subj="TotalDocumentsCard">
          <EuiStat title={documentCount} description={TOTAL_DOCUMENTS} titleColor="primary" />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel data-test-subj="TotalClicksCard">
          <EuiStat title={totalClicks} description={TOTAL_CLICKS} titleColor="primary" />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
