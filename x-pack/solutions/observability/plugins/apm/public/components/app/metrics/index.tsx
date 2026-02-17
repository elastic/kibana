/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isElasticAgentName, isJRubyAgentName } from '@kbn/elastic-agent-utils/src/agent_guards';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isAWSLambdaAgentName } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ServerlessMetrics } from './serverless_metrics';
import { ServiceMetrics } from './service_metrics';
import { JsonMetricsDashboard } from './static_dashboard';
import { hasDashboard } from './static_dashboard/helper';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { JvmMetricsOverview } from './jvm_metrics_overview';

export function Metrics() {
  const { agentName, runtimeName, serverlessType, telemetrySdkName, telemetrySdkLanguage } =
    useApmServiceContext();
  const isAWSLambda = isAWSLambdaAgentName(serverlessType);
  const { dataView, apmIndices } = useAdHocApmDataView();

  const hasDashboardFile = hasDashboard({ agentName, telemetrySdkName, telemetrySdkLanguage });

  if (isAWSLambda) {
    return <ServerlessMetrics />;
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

  if (hasDashboardFile && dataView) {
    return (
      <JsonMetricsDashboard
        agentName={agentName}
        telemetrySdkName={telemetrySdkName}
        telemetrySdkLanguage={telemetrySdkLanguage}
        runtimeName={runtimeName}
        serverlessType={serverlessType}
        dataView={dataView}
        apmIndices={apmIndices}
      />
    );
  }

  if (!isAWSLambda && isJRubyAgentName(agentName, runtimeName)) {
    return <JvmMetricsOverview />;
  }

  return <ServiceMetrics />;
}
