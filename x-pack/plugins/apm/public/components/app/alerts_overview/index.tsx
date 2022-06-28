/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { EuiPanel, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { ALERT_STATUS } from '@kbn/rule-data-utils';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../../plugin';
import { useApmParams } from '../../../hooks/use_apm_params';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  AlertsTableStatusFilter,
  ALL_ALERTS_FILTER,
  AlertStatusFilterButton,
} from '../../alerting/service_overview_alerts/alerts_table_status_filter';

export function AlertsOverview() {
  const {
    path: { serviceName },
    query: { environment },
  } = useApmParams('/services/{serviceName}/alerts');
  const { services } = useKibana<ApmPluginStartDeps>();
  const [alertStatusFilter, setAlertStatusFilter] = useState(ALL_ALERTS_FILTER);

  const {
    triggersActionsUi: {
      getAlertsStateTable,
      alertsTableConfigurationRegistry,
    },
  } = services;

  const alertQuery = useMemo(
    () => ({
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  term: { [SERVICE_NAME]: serviceName },
                },
              ],
              minimum_should_match: 1,
            },
          },
          ...(alertStatusFilter !== ALL_ALERTS_FILTER
            ? [
                {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          [ALERT_STATUS]: alertStatusFilter,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ]
            : []),
          ...environmentQuery(environment),
        ],
      },
    }),
    [serviceName, alertStatusFilter, environment]
  );

  const alertStateProps = {
    alertsTableConfigurationRegistry,
    id: 'service-overview-alerts',
    configurationId: AlertConsumers.OBSERVABILITY,
    featureIds: [AlertConsumers.APM],
    query: alertQuery,
    showExpandToDetails: false,
  };

  return (
    <EuiPanel borderRadius="none" hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <AlertsTableStatusFilter
                status={alertStatusFilter as AlertStatusFilterButton}
                onChange={setAlertStatusFilter}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>{getAlertsStateTable(alertStateProps)}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
