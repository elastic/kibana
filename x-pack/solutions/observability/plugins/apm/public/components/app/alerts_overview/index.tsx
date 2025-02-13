/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { ObservabilityAlertSearchBar } from '@kbn/observability-plugin/public';
import type { AlertStatus } from '@kbn/observability-plugin/common/typings';
import { EuiPanel, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import type { BoolQuery, Filter } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityAlertsTable } from '@kbn/observability-plugin/public';
import {
  APM_ALERTING_CONSUMERS,
  APM_ALERTING_RULE_TYPE_IDS,
} from '../../../../common/alerting/config/apm_alerting_feature_ids';
import type { ApmPluginStartDeps } from '../../../plugin';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
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
    triggersActionsUi: { getAlertsSearchBar: AlertsSearchBar },
    notifications,
    data,
    dataViews,
    http,
    spaces,
    uiSettings,
  } = services;
  const {
    query: {
      timefilter: { timefilter: timeFilterService },
    },
  } = data;

  const useToasts = () => notifications!.toasts;

  const apmFilters: Filter[] = useMemo(() => {
    const environmentKuery = getEnvironmentKuery(environment);
    const filters: Filter[] = [
      {
        query: {
          match_phrase: {
            [SERVICE_NAME]: serviceName,
          },
        },
        meta: {},
      },
    ];

    if (environmentKuery) {
      filters.push({
        query: {
          match_phrase: {
            [SERVICE_ENVIRONMENT]: environmentKuery,
          },
        },
        meta: {},
      });
    }
    return filters;
  }, [serviceName, environment]);

  const onKueryChange = useCallback(
    (value: any) => push(history, { query: { kuery: value } }),
    [history]
  );

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
              defaultFilters={apmFilters}
              onStatusChange={setAlertStatusFilter}
              onEsQueryChange={setEsQuery}
              rangeTo={rangeTo}
              rangeFrom={rangeFrom}
              status={alertStatusFilter}
              disableLocalStorageSync={true}
              services={{
                timeFilterService,
                AlertsSearchBar,
                http,
                data,
                dataViews,
                notifications,
                spaces,
                useToasts,
                uiSettings,
              }}
            />
          </EuiFlexItem>
        </EuiFlexItem>
        <EuiFlexItem>
          {esQuery && (
            <ObservabilityAlertsTable
              id={'service-overview-alerts'}
              ruleTypeIds={APM_ALERTING_RULE_TYPE_IDS}
              consumers={APM_ALERTING_CONSUMERS}
              query={esQuery}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
