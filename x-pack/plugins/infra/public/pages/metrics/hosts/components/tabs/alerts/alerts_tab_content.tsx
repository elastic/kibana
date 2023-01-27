/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { InfraClientStartDeps } from '../../../../../../types';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';

import { infraAlertFeatureIds } from './config';

export const AlertsTabContent = () => {
  const { services } = useKibana<InfraClientStartDeps>();
  const { charts, triggersActionsUi } = services;

  const { getAlertSummaryWidget: AlertSummaryWidget } = triggersActionsUi;

  const { dateRangeTimestamp } = useUnifiedSearchContext();

  const from = new Date(dateRangeTimestamp.from).toISOString();
  const to = new Date(dateRangeTimestamp.to).toISOString();

  const chartThemes = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        here goes the alert summary
        <AlertSummaryWidget
          featureIds={infraAlertFeatureIds}
          filter={{
            bool: {
              must: [],
              filter: [
                {
                  range: {
                    '@timestamp': {
                      format: 'strict_date_optional_time',
                      gte: from,
                      lte: to,
                    },
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          }}
          fullSize
          timeRange={{
            utcFrom: from,
            utcTo: to,
            fixedInterval: '10800s',
            dateFormat: 'YYYY-MM-DD HH:mm',
          }}
          chartThemes={chartThemes}
        />
      </EuiFlexItem>
      <EuiFlexItem>here goes the filter group button</EuiFlexItem>
      <EuiFlexItem>
        Here goes the table
        {/* <CasesContext
          owner={[observabilityFeatureId]}
          permissions={userCasesPermissions}
          features={{ alerts: { sync: false } }}
        >
          {esQuery && (
            <AlertsStateTable
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              configurationId={AlertConsumers.OBSERVABILITY}
              id={ALERTS_TABLE_ID}
              flyoutSize="s"
              featureIds={observabilityAlertFeatureIds}
              query={esQuery}
              showExpandToDetails={false}
              pageSize={ALERTS_PER_PAGE}
            />
          )}
        </CasesContext> */}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
