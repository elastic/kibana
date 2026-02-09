/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import React from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { HealthBadge } from '../../service_inventory/service_list/health_badge';

export function ServiceHealthPanel() {
  const { serviceName } = useApmServiceContext();
  const router = useApmRouter();
  const {
    query,
    query: { rangeFrom, rangeTo, environment },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  // Fetch service health data
  const { data: serviceHealthData } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi('GET /internal/apm/services/{serviceName}/health_status', {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              environment,
            },
          },
        });
      }
    },
    [serviceName, start, end, environment]
  );

  const combinedHealthStatus = serviceHealthData?.combinedHealthStatus;
  const alertsCount = serviceHealthData?.alertsCount;
  const sloStatus = serviceHealthData?.sloStatus;
  const sloCount = serviceHealthData?.sloCount;

  // Don't show panel if there's no health data
  if (
    !combinedHealthStatus &&
    (!alertsCount || alertsCount === 0) &&
    (!sloCount || sloCount === 0)
  ) {
    return null;
  }

  return (
    <EuiPanel hasBorder={true}>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.serviceOverview.healthPanel.title', {
            defaultMessage: 'Health',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {combinedHealthStatus && (
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.apm.serviceOverview.healthPanel.status', {
                    defaultMessage: 'Status:',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <HealthBadge healthStatus={combinedHealthStatus} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        {alertsCount !== undefined && alertsCount > 0 && (
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.apm.serviceOverview.healthPanel.alerts', {
                    defaultMessage: 'Alerts:',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="serviceHealthPanelAlertsBadgeLink"
                  href={router.link('/services/{serviceName}/alerts', {
                    path: { serviceName },
                    query: {
                      ...query,
                      alertStatus: ALERT_STATUS_ACTIVE,
                    },
                  })}
                >
                  <EuiText size="s">
                    {i18n.translate('xpack.apm.serviceOverview.healthPanel.alertsCount', {
                      defaultMessage:
                        '{count, plural, one {# active alert} other {# active alerts}}',
                      values: { count: alertsCount },
                    })}
                  </EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        {sloStatus && sloCount !== undefined && sloCount > 0 && (
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.apm.serviceOverview.healthPanel.slos', {
                    defaultMessage: 'SLOs:',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate('xpack.apm.serviceOverview.healthPanel.sloStatus', {
                    defaultMessage: '{count, plural, one {# SLO} other {# SLOs}} - {status}',
                    values: { count: sloCount, status: sloStatus },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
