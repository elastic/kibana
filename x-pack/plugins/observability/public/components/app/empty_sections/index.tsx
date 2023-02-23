/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { ThemeContext } from 'styled-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

import {
  ALERT_APP,
  APM_APP,
  INFRA_LOGS_APP,
  INFRA_METRICS_APP,
  SYNTHETICS_APP,
  UX_APP,
} from '../../../context/constants';
import { ObservabilityAppServices } from '../../../application/types';

import { EmptySection } from './empty_section';
import { useFetchApmServicesHasData } from '../../../hooks/overview/use_fetch_apm_services_has_data';
import { useFetchInfraLogsHasData } from '../../../hooks/overview/use_fetch_infra_logs_has_data';
import { useFetchInfraMetricsHasData } from '../../../hooks/overview/use_fetch_infra_metrics_has_data';
import { useFetchSyntheticsUptimeHasData } from '../../../hooks/overview/use_fetch_synthetics_uptime_has_data';
import { useFetchObservabilityAlerts } from '../../../hooks/use_fetch_observability_alerts';
import { useFetchUxHasData } from '../../../hooks/overview/use_fetch_ux_has_data';
import { paths } from '../../../config/paths';

export function EmptySections() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const theme = useContext(ThemeContext);

  const {
    alerts,
    isLoading: alertsIsLoading,
    isError: alertsIsError,
  } = useFetchObservabilityAlerts();

  const {
    data: apmServices,
    isLoading: apmServicesIsLoading,
    isError: apmServicesIsError,
  } = useFetchApmServicesHasData();

  const {
    data: infraLogs,
    isLoading: infraLogsIsLoading,
    isError: infraLogsIsError,
  } = useFetchInfraLogsHasData();

  const {
    data: infraMetrics,
    isLoading: infraMetricsIsLoading,
    isError: infraMetricsIsError,
  } = useFetchInfraMetricsHasData();

  const {
    data: syntheticsUptime,
    isLoading: syntheticsUptimeIsLoading,
    isError: syntheticsUptimeIsError,
  } = useFetchSyntheticsUptimeHasData();

  const { data: ux, isLoading: uxIsLoading, isError: uxIsError } = useFetchUxHasData();

  const hasAnyData = [
    syntheticsUptime?.hasData,
    infraMetrics?.hasData,
    infraLogs?.hasData,
    apmServices?.hasData,
    alerts && alerts.length > 0,
  ].filter(Boolean);

  const boxStyle = {
    border: `${theme.eui.euiBorderEditable}`,
    borderRadius: `${theme.eui.euiBorderRadius}`,
  };

  return (
    <EuiFlexItem>
      <EuiSpacer size="s" />

      <EuiFlexGrid
        columns={
          // when more than 2 empty sections are available show them on 2 columns, otherwise 1
          hasAnyData.length > 2 ? 2 : 1
        }
        gutterSize="s"
      >
        <EuiFlexItem style={boxStyle}>
          {(!alertsIsLoading && alerts && alerts.length === 0) || alertsIsError ? (
            <EmptySection
              id={ALERT_APP}
              title={i18n.translate('xpack.observability.emptySection.apps.alert.title', {
                defaultMessage: 'No alerts found.',
              })}
              description={i18n.translate(
                'xpack.observability.emptySection.apps.alert.description',
                {
                  defaultMessage:
                    'Detect complex conditions within Observability and trigger actions when those conditions are met.',
                }
              )}
              linkTitle={i18n.translate('xpack.observability.emptySection.apps.alert.link', {
                defaultMessage: 'Create rule',
              })}
              href={http.basePath.prepend(paths.observability.rules)}
            />
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem style={boxStyle}>
          {(!infraLogsIsLoading && !infraLogs?.hasData) || infraLogsIsError ? (
            <EmptySection
              id={INFRA_LOGS_APP}
              title={i18n.translate('xpack.observability.emptySection.apps.logs.title', {
                defaultMessage: 'Logs',
              })}
              description={i18n.translate(
                'xpack.observability.emptySection.apps.logs.description',
                {
                  defaultMessage:
                    'Fast, easy, and scalable centralized log monitoring with out-of-the-box support for common data sources.',
                }
              )}
              linkTitle={i18n.translate('xpack.observability.emptySection.apps.logs.link', {
                defaultMessage: 'Install Filebeat',
              })}
              href={http.basePath.prepend('/app/home#/tutorial_directory/logging')}
            />
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem style={boxStyle}>
          {(!apmServicesIsLoading && !apmServices?.hasData) || apmServicesIsError ? (
            <EmptySection
              id={APM_APP}
              title={i18n.translate('xpack.observability.emptySection.apps.apm.title', {
                defaultMessage: 'APM',
              })}
              description={i18n.translate('xpack.observability.emptySection.apps.apm.description', {
                defaultMessage:
                  'Get deeper visibility into your applications with extensive support for popular languages, OpenTelemetry, and distributed tracing.',
              })}
              linkTitle={i18n.translate('xpack.observability.emptySection.apps.apm.link', {
                defaultMessage: 'Install Agent',
              })}
              href={http.basePath.prepend('/app/home#/tutorial/apm')}
            />
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem style={boxStyle}>
          {(!infraMetricsIsLoading && !infraMetrics?.hasData) || infraMetricsIsError ? (
            <EmptySection
              id={INFRA_METRICS_APP}
              title={i18n.translate('xpack.observability.emptySection.apps.metrics.title', {
                defaultMessage: 'Metrics',
              })}
              description={i18n.translate(
                'xpack.observability.emptySection.apps.metrics.description',
                {
                  defaultMessage: 'Stream, visualize, and analyze your infrastructure metrics.',
                }
              )}
              linkTitle={i18n.translate('xpack.observability.emptySection.apps.metrics.link', {
                defaultMessage: 'Install Metricbeat',
              })}
              href={http.basePath.prepend('/app/home#/tutorial_directory/metrics')}
            />
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem style={boxStyle}>
          {(!syntheticsUptimeIsLoading && !syntheticsUptime?.hasData) || syntheticsUptimeIsError ? (
            <EmptySection
              id={SYNTHETICS_APP}
              title={i18n.translate('xpack.observability.emptySection.apps.uptime.title', {
                defaultMessage: 'Uptime',
              })}
              description={i18n.translate(
                'xpack.observability.emptySection.apps.uptime.description',
                {
                  defaultMessage:
                    'Proactively monitor the availability and functionality of user journeys.',
                }
              )}
              linkTitle={i18n.translate('xpack.observability.emptySection.apps.uptime.link', {
                defaultMessage: 'Install Heartbeat',
              })}
              href={http.basePath.prepend('/app/home#/tutorial/uptimeMonitors')}
            />
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem style={boxStyle}>
          {(!uxIsLoading && !ux?.hasData) || uxIsError ? (
            <EmptySection
              id={UX_APP}
              title={i18n.translate('xpack.observability.emptySection.apps.ux.title', {
                defaultMessage: 'User Experience',
              })}
              description={i18n.translate('xpack.observability.emptySection.apps.ux.description', {
                defaultMessage:
                  'Collect, measure, and analyze performance data that reflects real-world user experiences.',
              })}
              linkTitle={i18n.translate('xpack.observability.emptySection.apps.ux.link', {
                defaultMessage: 'Install RUM Agent',
              })}
              href={http.basePath.prepend('/app/home#/tutorial/apm')}
            />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiFlexItem>
  );
}
