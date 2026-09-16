/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { AgentName, AnomalyDetectorType, Environment } from '@kbn/apm-types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SloStatus } from '../../../../../common/service_inventory';
import { useApmRoutePath } from '../../../../hooks/use_apm_route_path';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useServiceSloContext } from '../../../../context/service_slo/use_service_slo_context';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { SloStatusBadge } from '../../../shared/slo_status_badge';
import type { ApmPluginStartDeps, ApmServices } from '../../../../plugin';
import { AnomaliesBadge } from '../../../app/service_inventory/service_list/anomalies_badge';
import { SERVICE_HEADER_EBT_ELEMENTS } from '../../../app/ebt_constants';

interface ServiceHeaderStatusProps {
  start: string;
  end: string;
  onSloClick: () => void;
  alertsTabHref: string;
}

interface ServiceHeaderStatusData {
  serviceName: string;
  alertsCount: number;
  showAlerts: boolean;
  showSlo: boolean;
  showAnomalies: boolean;
  sloStatus: SloStatus | 'noSLOs';
  sloCount: number;
  anomalyScore?: number;
  anomalyDetectorType?: AnomalyDetectorType;
  alertsTabHref: string;
  onSloClick: () => void;
  agentName?: string;
  anomalyEnvironment?: Environment;
  transactionType?: string;
  rangeFrom?: string;
  rangeTo?: string;
  comparisonEnabled?: boolean;
  isInOverviewTab: boolean;
  isShowingExpectedBounds: boolean;
  shareLocators?: SharePluginStart['url']['locators'];
}

function useServiceHeaderStatusData({
  start,
  end,
  onSloClick,
  alertsTabHref,
}: ServiceHeaderStatusProps): ServiceHeaderStatusData {
  const { core, plugins, share } = useApmPluginContext();
  const { capabilities } = core.application;
  const { isAlertingAvailable, canReadAlerts } = getAlertingCapabilities(plugins, capabilities);
  const canReadSlos = !!capabilities.slo?.read;
  const canReadMlJobs = !!capabilities.ml?.canGetJobs;

  const {
    path: { serviceName },
    query,
    query: { environment, comparisonEnabled, offset },
  } = useApmParams('/services/{serviceName}/*');

  const routePath = useApmRoutePath();
  const isInOverviewTab = routePath === '/services/{serviceName}/overview';
  const { agentName } = useApmServiceContext();
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
        .then((res) => ({
          anomalyScore: res.anomalyScore,
          detectorType: res.detectorType,
          anomalyEnvironment: res.anomalyEnvironment,
        }))
        .catch(
          (): {
            anomalyScore?: number;
            detectorType?: AnomalyDetectorType;
            anomalyEnvironment?: Environment;
          } => ({})
        );
    },
    [serviceName, start, end, environment, canReadMlJobs],
    { showToastOnError: false }
  );

  const alertsCount = alertsData?.alertsCount ?? 0;
  const showAlerts =
    isAlertingAvailable &&
    canReadAlerts &&
    alertsStatus === FETCH_STATUS.SUCCESS &&
    alertsCount > 0;
  const showAnomalies =
    canReadMlJobs &&
    anomalyStatus === FETCH_STATUS.SUCCESS &&
    anomalyData?.anomalyScore !== undefined;
  const isShowingExpectedBounds = comparisonEnabled && offset === 'expected_bounds';
  const showSlo = canReadSlos && sloFetchStatus === FETCH_STATUS.SUCCESS;

  useEffect(() => {
    if (showSlo) {
      telemetry.reportSloInfoShown();
    }
  }, [showSlo, telemetry]);

  return useMemo(
    () => ({
      serviceName,
      alertsCount,
      showAlerts,
      showSlo,
      showAnomalies,
      sloStatus: mostCriticalSloStatus.status,
      sloCount: mostCriticalSloStatus.count,
      anomalyScore: anomalyData?.anomalyScore,
      anomalyDetectorType: anomalyData?.detectorType,
      alertsTabHref,
      onSloClick,
      agentName,
      anomalyEnvironment: anomalyData?.anomalyEnvironment,
      transactionType: query.transactionType,
      rangeFrom: query.rangeFrom,
      rangeTo: query.rangeTo,
      comparisonEnabled,
      isInOverviewTab,
      isShowingExpectedBounds,
      shareLocators: share?.url?.locators,
    }),
    [
      agentName,
      alertsCount,
      alertsTabHref,
      anomalyData?.anomalyEnvironment,
      anomalyData?.anomalyScore,
      anomalyData?.detectorType,
      comparisonEnabled,
      isInOverviewTab,
      isShowingExpectedBounds,
      mostCriticalSloStatus.count,
      mostCriticalSloStatus.status,
      onSloClick,
      query.rangeFrom,
      query.rangeTo,
      query.transactionType,
      serviceName,
      share?.url?.locators,
      showAlerts,
      showAnomalies,
      showSlo,
    ]
  );
}

/** Status badges row (alerts / SLO / anomaly) below AppHeader tabs, above search. */
export function ServiceHeaderBadges(props: ServiceHeaderStatusProps) {
  const { euiTheme } = useEuiTheme();
  const data = useServiceHeaderStatusData(props);

  const badges = useMemo(() => {
    const items: Array<{ key: string; node: React.ReactNode }> = [];

    if (data.showAlerts) {
      const alertsTooltip = i18n.translate('xpack.apm.serviceHeader.alertsBadge.countLabel', {
        defaultMessage:
          '{count, plural, one {# active alert} other {# active alerts}}. Click to view more.',
        values: { count: data.alertsCount },
      });

      items.push({
        key: 'alerts',
        node: (
          <EuiToolTip position="bottom" content={alertsTooltip}>
            <EuiBadge
              data-test-subj="serviceHeaderAlertsBadge"
              color="danger"
              iconType="warning"
              href={data.alertsTabHref}
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.VIEW_ALERTS,
                element: SERVICE_HEADER_EBT_ELEMENTS.ALERTS_BADGE,
              })}
            >
              {data.alertsCount}
            </EuiBadge>
          </EuiToolTip>
        ),
      });
    }

    if (data.showSlo) {
      items.push({
        key: 'slo',
        node: (
          <SloStatusBadge
            sloStatus={data.sloStatus}
            sloCount={data.sloCount}
            serviceName={data.serviceName}
            onClick={data.onSloClick}
            ebt={{
              action: EBT_CLICK_ACTIONS.VIEW_SLOS,
              element: SERVICE_HEADER_EBT_ELEMENTS.SLO_BADGE,
            }}
          />
        ),
      });
    }

    if (data.showAnomalies) {
      items.push({
        key: 'anomalies',
        node: (
          <span data-test-subj="serviceHeaderAnomaliesBadge">
            <AnomaliesBadge
              score={data.anomalyScore}
              detectorType={data.anomalyDetectorType}
              ebt={{
                action: EBT_CLICK_ACTIONS.VIEW_ANOMALIES,
                element: SERVICE_HEADER_EBT_ELEMENTS.ANOMALIES_BADGE,
              }}
              navigationProps={
                data.agentName &&
                data.anomalyEnvironment &&
                data.shareLocators &&
                data.rangeFrom &&
                data.rangeTo
                  ? {
                      serviceName: data.serviceName,
                      agentName: data.agentName as AgentName,
                      anomalyEnvironment: data.anomalyEnvironment,
                      transactionType: data.transactionType,
                      rangeFrom: data.rangeFrom,
                      rangeTo: data.rangeTo,
                      locators: data.shareLocators,
                      comparisonEnabled: data.isInOverviewTab
                        ? !data.isShowingExpectedBounds
                        : true,
                      isInServiceOverview: data.isInOverviewTab,
                    }
                  : undefined
              }
            />
          </span>
        ),
      });
    }

    return items;
  }, [data]);

  if (badges.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={{ marginBottom: euiTheme.size.m }}
    >
      {badges.map(({ key, node }) => (
        <EuiFlexItem key={key} grow={false}>
          {node}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
