/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { EngineOverviewLogic } from '..';
import { EuiButtonEmptyTo } from '../../../../shared/react_router_helpers';
import { ENGINE_ANALYTICS_PATH, ENGINE_API_LOGS_PATH } from '../../../routes';
import { AnalyticsChart, convertToChartData } from '../../analytics';
import { TOTAL_QUERIES, TOTAL_API_OPERATIONS } from '../../analytics/constants';
import { DataPanel } from '../../data_panel';
import { generateEnginePath } from '../../engine';

import { VIEW_ANALYTICS, VIEW_API_LOGS, LAST_7_DAYS } from '../constants';

export const TotalCharts: React.FC = () => {
  const { startDate, queriesPerDay, operationsPerDay } = useValues(EngineOverviewLogic);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <DataPanel
          data-test-subj="TotalQueriesChart"
          title={<h2>{TOTAL_QUERIES}</h2>}
          subtitle={LAST_7_DAYS}
          action={
            <EuiButtonEmptyTo
              iconType="eye"
              to={generateEnginePath(ENGINE_ANALYTICS_PATH)}
              size="s"
            >
              {VIEW_ANALYTICS}
            </EuiButtonEmptyTo>
          }
          hasBorder
        >
          <AnalyticsChart
            lines={[
              {
                id: TOTAL_QUERIES,
                data: convertToChartData({ startDate, data: queriesPerDay }),
              },
            ]}
            height={240}
          />
        </DataPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <DataPanel
          data-test-subj="TotalApiOperationsChart"
          title={<h2>{TOTAL_API_OPERATIONS}</h2>}
          subtitle={LAST_7_DAYS}
          action={
            <EuiButtonEmptyTo iconType="eye" to={generateEnginePath(ENGINE_API_LOGS_PATH)} size="s">
              {VIEW_API_LOGS}
            </EuiButtonEmptyTo>
          }
          hasBorder
        >
          <AnalyticsChart
            lines={[
              {
                id: TOTAL_API_OPERATIONS,
                data: convertToChartData({ startDate, data: operationsPerDay }),
              },
            ]}
            height={240}
          />
        </DataPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
