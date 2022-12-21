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
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  AlertsTableStatusFilter,
  ALL_ALERTS_FILTER,
  AlertStatusFilterButton,
} from './alerts_table_status_filter';

export function AlertsOverview() {
  const {
    path: { serviceName },
    query: { environment },
  } = useAnyOfApmParams(
    '/services/{serviceName}/alerts',
    '/mobile-services/{serviceName}/alerts'
  );
  const { services } = useKibana<ApmPluginStartDeps>();
  const [alertStatusFilter, setAlertStatusFilter] =
    useState<AlertStatusFilterButton>(ALL_ALERTS_FILTER);

  const {
    triggersActionsUi: {
      getAlertsStateTable: AlertsStateTable,
      alertsTableConfigurationRegistry,
    },
  } = services;

  const alertQuery = useMemo(
    () => ({
      bool: {
        filter: [
          {
            term: { [SERVICE_NAME]: serviceName },
          },
          ...(alertStatusFilter !== ALL_ALERTS_FILTER
            ? [
                {
                  term: { [ALERT_STATUS]: alertStatusFilter },
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
          <EuiFlexItem grow={false}>
            <AlertsTableStatusFilter
              status={alertStatusFilter}
              onChange={setAlertStatusFilter}
            />
          </EuiFlexItem>
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertsStateTable {...alertStateProps} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
