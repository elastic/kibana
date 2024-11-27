/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { ObservabilityAlertSearchBar } from '@kbn/observability-plugin/public';
import { AlertStatus } from '@kbn/observability-plugin/common/typings';
import { EuiPanel, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { BoolQuery } from '@kbn/es-query';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../../plugin';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { getEnvironmentKuery } from '../../../../common/environment_filter_values';
import { push } from '../../shared/links/url_helpers';

export const ALERT_STATUS_ALL = 'all';

export function AlertsOverview() {
  const history = useHistory();
  const {
    path: { serviceName },
    query: { environment, rangeFrom, rangeTo, kuery, alertStatus },
  } = useAnyOfApmParams('/services/{serviceName}/alerts', '/mobile-services/{serviceName}/alerts');
  const { services } = useKibana<ApmPluginStartDeps>();
  const [alertStatusFilter, setAlertStatusFilter] = useState<AlertStatus>(ALERT_STATUS_ALL);
  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();

  useEffect(() => {
    if (alertStatus) {
      setAlertStatusFilter(alertStatus as AlertStatus);
    }
  }, [alertStatus]);

  const {
    triggersActionsUi: {
      getAlertsStateTable: AlertsStateTable,
      getAlertsSearchBar: AlertsSearchBar,
      alertsTableConfigurationRegistry,
    },
    notifications,
    data: {
      query: {
        timefilter: { timefilter: timeFilterService },
      },
    },
    uiSettings,
    observability: { observabilityRuleTypeRegistry },
  } = services;

  const useToasts = () => notifications!.toasts;

  const apmQueries = useMemo(() => {
    const environmentKuery = getEnvironmentKuery(environment);
    let query = `${SERVICE_NAME}:${serviceName}`;

    if (environmentKuery) {
      query += ` AND ${environmentKuery}`;
    }
    return [
      {
        query,
        language: 'kuery',
      },
    ];
  }, [serviceName, environment]);

  const onKueryChange = useCallback(
    (value: any) => push(history, { query: { kuery: value } }),
    [history]
  );

  const alertsTableFeatureIds = [
    AlertConsumers.APM,
    AlertConsumers.OBSERVABILITY,
    AlertConsumers.SLO,
    AlertConsumers.LOGS,
  ];

  return (
    <EuiPanel borderRadius="none" hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ObservabilityAlertSearchBar
              appName={'apmApp'}
              kuery={kuery}
              onRangeFromChange={(value) => push(history, { query: { rangeFrom: value } })}
              onRangeToChange={(value) => push(history, { query: { rangeTo: value } })}
              onKueryChange={onKueryChange}
              defaultSearchQueries={apmQueries}
              onStatusChange={setAlertStatusFilter}
              onEsQueryChange={setEsQuery}
              rangeTo={rangeTo}
              rangeFrom={rangeFrom}
              status={alertStatusFilter}
              services={{
                timeFilterService,
                AlertsSearchBar,
                useToasts,
                uiSettings,
              }}
            />
          </EuiFlexItem>
        </EuiFlexItem>
        <EuiFlexItem>
          {esQuery && (
            <AlertsStateTable
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              id={'service-overview-alerts'}
              configurationId={AlertConsumers.OBSERVABILITY}
              featureIds={alertsTableFeatureIds}
              query={esQuery}
              showAlertStatusWithFlapping
              cellContext={{ observabilityRuleTypeRegistry }}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
