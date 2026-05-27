/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useServiceSloContext } from '../../../../context/service_slo/use_service_slo_context';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { SloStatusBadge } from '../../../shared/slo_status_badge';
import type { ApmPluginStartDeps, ApmServices } from '../../../../plugin';
import { AnomaliesBadge } from '../../../app/service_inventory/service_list/anomalies_badge';

interface ServiceHeaderBadgesProps {
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  onSloClick: () => void;
  alertsTabHref: string;
}

export function ServiceHeaderBadges({
  serviceName,
  environment,
  start,
  end,
  onSloClick,
  alertsTabHref,
}: ServiceHeaderBadgesProps) {
  const { euiTheme } = useEuiTheme();
  const { core, plugins } = useApmPluginContext();
  const { capabilities, navigateToUrl } = core.application;
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(plugins, capabilities);
  const canReadSlos = !!capabilities.slo?.read;
  const canReadMlJobs = !!capabilities.ml?.canGetJobs;

  const { mostCriticalSloStatus, sloFetchStatus } = useServiceSloContext();

  const {
    services: { telemetry },
  } = useKibana<ApmPluginStartDeps & ApmServices>();

  const { data: alertsData, status: alertsStatus } = useFetcher(
    (callApmApi) => {
      if (!(isAlertingAvailable && canReadAlerts)) {
        return;
      }
      return callApmApi('GET /internal/apm/services/{serviceName}/alerts_count', {
        params: {
          path: { serviceName },
          query: { start, end, environment },
        },
      })
        .then((res) => ({ alertsCount: res.alertsCount }))
        .catch(() => ({ alertsCount: 0 }));
    },
    [serviceName, start, end, environment, isAlertingAvailable, canReadAlerts],
    { showToastOnError: false }
  );

  const { data: anomalyData, status: anomalyStatus } = useFetcher(
    (callApmApi) => {
      if (!canReadMlJobs) {
        return;
      }
      return callApmApi('GET /internal/apm/services/{serviceName}/anomaly_score', {
        params: {
          path: { serviceName },
          query: { start, end, environment },
        },
      })
        .then((res) => ({ anomalyScore: res.anomalyScore }))
        .catch((): { anomalyScore?: number } => ({}));
    },
    [serviceName, start, end, environment, canReadMlJobs],
    { showToastOnError: false }
  );

  const alertsCount = alertsData?.alertsCount ?? 0;

  const showAlertsBadge =
    isAlertingAvailable &&
    canReadAlerts &&
    alertsStatus === FETCH_STATUS.SUCCESS &&
    alertsCount > 0;

  const showAnomaliesBadge =
    canReadMlJobs &&
    anomalyStatus === FETCH_STATUS.SUCCESS &&
    anomalyData?.anomalyScore !== undefined;

  const showSloBadge = canReadSlos && sloFetchStatus === FETCH_STATUS.SUCCESS;

  useEffect(() => {
    if (showSloBadge) {
      telemetry.reportSloInfoShown();
    }
  }, [showSloBadge, telemetry]);

  if (!showAlertsBadge && !showSloBadge && !showAnomaliesBadge) {
    return null;
  }

  const alertsTooltip = i18n.translate('xpack.apm.serviceHeader.alertsBadge.tooltip', {
    defaultMessage: '{count, plural, one {# active alert} other {# active alerts}}. Click to view.',
    values: { count: alertsCount },
  });

  const onAlertsBadgeClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    navigateToUrl(alertsTabHref);
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={{ marginBottom: euiTheme.size.m }}
    >
      {showAlertsBadge && (
        <EuiFlexItem grow={false}>
          <EuiToolTip position="bottom" content={alertsTooltip}>
            <EuiBadge
              data-test-subj="serviceHeaderAlertsBadge"
              color="danger"
              iconType="warning"
              onClick={onAlertsBadgeClick}
              tabIndex={0}
              role="button"
              onClickAriaLabel={alertsTooltip}
            >
              {alertsCount}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {showSloBadge && (
        <EuiFlexItem grow={false}>
          <SloStatusBadge
            sloStatus={mostCriticalSloStatus.status}
            sloCount={mostCriticalSloStatus.count}
            serviceName={serviceName}
            onClick={onSloClick}
          />
        </EuiFlexItem>
      )}
      {showAnomaliesBadge && (
        <EuiFlexItem grow={false} data-test-subj="serviceHeaderAnomaliesBadge">
          <AnomaliesBadge score={anomalyData?.anomalyScore} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
