/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { isElasticAgentName, isJRubyAgentName } from '@kbn/elastic-agent-utils/src/agent_guards';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isAWSLambdaAgentName } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { ServerlessMetrics } from './serverless_metrics';
import { ServiceMetrics } from './service_metrics';
import { JsonMetricsDashboard } from './static_dashboard';
import { hasDashboard } from './static_dashboard/helper';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { JvmMetricsOverview } from './jvm_metrics_overview';

export function Metrics() {
  const {
    agentName,
    runtimeName,
    runtimeVersion,
    serverlessType,
    telemetrySdkName,
    telemetrySdkLanguage,
    serviceAgentStatus,
    hasMultipleAgentTypes,
    ingestionTimeRanges,
  } = useApmServiceContext();
  const isAWSLambda = isAWSLambdaAgentName(serverlessType);
  const { dataView, apmIndices } = useAdHocApmDataView();

  const hasDashboardFile = hasDashboard({
    agentName,
    telemetrySdkName,
    telemetrySdkLanguage,
    runtimeVersion,
  });

  if (isAWSLambda) {
    return <ServerlessMetrics />;
  }

  if (serviceAgentStatus === FETCH_STATUS.SUCCESS && !agentName) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.apm.metrics.noDataForRange.title', {
          defaultMessage:
            'No metrics data found for the selected time range. Try adjusting the time range.',
        })}
        iconType="eyeSlash"
        color="warning"
        data-test-subj="apmMetricsNoDataForRange"
      />
    );
  }

  if (!hasDashboardFile && !isElasticAgentName(agentName ?? '')) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.apm.metrics.emptyState.title', {
          defaultMessage: 'Runtime metrics are not available for this Agent / SDK type.',
        })}
        iconType="info"
        data-test-subj="apmMetricsNoDashboardFound"
      />
    );
  }

  const dateFormat = 'MMM D, YYYY HH:mm';
  const formatRange = (range: { from: number; to: number }) =>
    `${moment(range.from).format(dateFormat)} – ${moment(range.to).format(dateFormat)}`;

  const hasOverlap =
    ingestionTimeRanges &&
    ingestionTimeRanges.classicApm.from < ingestionTimeRanges.otelNative.to &&
    ingestionTimeRanges.otelNative.from < ingestionTimeRanges.classicApm.to;

  const mixedAgentCallout = (() => {
    if (!hasMultipleAgentTypes || !ingestionTimeRanges) {
      return null;
    }

    if (hasOverlap) {
      return (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.apm.metrics.mixedAgentTypes.overlapping.title', {
              defaultMessage:
                'This service has overlapping data from multiple instrumentation types. Only metrics from the most recent instrumentation are shown.',
            })}
            iconType="warning"
            color="warning"
            data-test-subj="apmMetricsMixedAgentTypesOverlap"
          >
            <p>
              {i18n.translate('xpack.apm.metrics.mixedAgentTypes.classicRange', {
                defaultMessage: 'Classic APM metrics: {range}',
                values: { range: formatRange(ingestionTimeRanges.classicApm) },
              })}
              <br />
              {i18n.translate('xpack.apm.metrics.mixedAgentTypes.otelRange', {
                defaultMessage: 'OpenTelemetry metrics: {range}',
                values: { range: formatRange(ingestionTimeRanges.otelNative) },
              })}
            </p>
            <p>
              {i18n.translate('xpack.apm.metrics.mixedAgentTypes.overlapping.description', {
                defaultMessage:
                  'Both instrumentation types are sending data simultaneously. Metrics from the other type are not displayed in this view.',
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      );
    }

    return (
      <>
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.apm.metrics.mixedAgentTypes.sequential.title', {
            defaultMessage:
              'The selected time range contains data from multiple instrumentation types. Only metrics from the most recent instrumentation are shown.',
          })}
          iconType="info"
          color="primary"
          data-test-subj="apmMetricsMixedAgentTypes"
        >
          <p>
            {i18n.translate('xpack.apm.metrics.mixedAgentTypes.classicRange', {
              defaultMessage: 'Classic APM metrics: {range}',
              values: { range: formatRange(ingestionTimeRanges.classicApm) },
            })}
            <br />
            {i18n.translate('xpack.apm.metrics.mixedAgentTypes.otelRange', {
              defaultMessage: 'OpenTelemetry metrics: {range}',
              values: { range: formatRange(ingestionTimeRanges.otelNative) },
            })}
          </p>
          <p>
            {i18n.translate('xpack.apm.metrics.mixedAgentTypes.sequential.description', {
              defaultMessage:
                'Adjust the time range to view metrics from a specific instrumentation type.',
            })}
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  })();

  if (hasDashboardFile && dataView) {
    return (
      <>
        {mixedAgentCallout}
        <JsonMetricsDashboard
          agentName={agentName}
          telemetrySdkName={telemetrySdkName}
          telemetrySdkLanguage={telemetrySdkLanguage}
          runtimeName={runtimeName}
          runtimeVersion={runtimeVersion}
          serverlessType={serverlessType}
          dataView={dataView}
          apmIndices={apmIndices}
        />
      </>
    );
  }

  if (!isAWSLambda && isJRubyAgentName(agentName, runtimeName)) {
    return (
      <>
        {mixedAgentCallout}
        <JvmMetricsOverview />
      </>
    );
  }

  return (
    <>
      {mixedAgentCallout}
      <ServiceMetrics />
    </>
  );
}
