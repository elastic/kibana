/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import React from 'react';
import { InfraClientCoreStart, InfraClientStartDeps } from '../../../../../../types';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';

import {
  ALERTS_PER_PAGE,
  ALERTS_TABLE_ID,
  infraAlertFeatureId,
  infraAlertFeatureIds,
} from './config';

export const AlertsTabContent = () => {
  const { services } = useKibana<InfraClientCoreStart & InfraClientStartDeps>();
  const { application, cases, charts, triggersActionsUi } = services;

  const {
    alertsTableConfigurationRegistry,
    getAlertSummaryWidget: AlertSummaryWidget,
    getAlertsStateTable: AlertsStateTable,
  } = triggersActionsUi;

  const uiCapabilities = application?.capabilities;

  const casesCapabilities = cases.helpers.getUICapabilities(uiCapabilities.observabilityCases);

  const CasesContext = cases.ui.getCasesContext();

  const { dateRangeTimestamp } = useUnifiedSearchContext();

  const from = new Date(dateRangeTimestamp.from).toISOString();
  const to = new Date(dateRangeTimestamp.to).toISOString();

  const chartThemes = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };

  const esQuery = {
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
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <AlertSummaryWidget
          featureIds={infraAlertFeatureIds}
          filter={esQuery}
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
      {esQuery && (
        <EuiFlexItem>
          <CasesContext
            owner={[infraAlertFeatureId]}
            permissions={casesCapabilities}
            features={{ alerts: { sync: false } }}
          >
            <AlertsStateTable
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              configurationId={AlertConsumers.OBSERVABILITY}
              featureIds={infraAlertFeatureIds}
              flyoutSize="s"
              id={ALERTS_TABLE_ID}
              pageSize={ALERTS_PER_PAGE}
              query={esQuery}
              showExpandToDetails={false}
            />
          </CasesContext>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

// {
//   "bool": {
//     "should": [
//       {
//         "bool": {
//           "should": [
//             {
//               "match_phrase": {
//                 "host.name": "gke-edge-lite-oblt-edge-lite-oblt-poo-ac0838be-dvt6"
//               }
//             }
//           ],
//           "minimum_should_match": 1
//         }
//       },
//       {
//         "bool": {
//           "should": [
//             {
//               "match_phrase": {
//                 "host.name": "gke-edge-lite-oblt-edge-lite-oblt-poo-ac0838be-md8s"
//               }
//             }
//           ],
//           "minimum_should_match": 1
//         }
//       }
//     ],
//       "minimum_should_match": 1
//   }
// }
