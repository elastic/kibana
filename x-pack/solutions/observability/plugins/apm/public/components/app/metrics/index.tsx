/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isElasticAgentName, isJRubyAgentName } from '@kbn/elastic-agent-utils/src/agent_guards';
import { EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isAWSLambdaAgentName } from '../../../../common/agent_name';
import type { ApmPluginStartDeps } from '../../../plugin';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ServerlessMetrics } from './serverless_metrics';
import { ServiceMetrics } from './service_metrics';
import { JsonMetricsDashboard } from './static_dashboard';
import { hasDashboard } from './static_dashboard/helper';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { JvmMetricsOverview } from './jvm_metrics_overview';
import { DynamicDashboard } from './dynamic_dashboard';
import { useResolvedPanels } from './dynamic_dashboard/use_resolved_panels';

export function Metrics() {
  const { services } = useKibana<ApmPluginStartDeps>();
  const {
    agentName,
    runtimeName,
    serverlessType,
    serviceName,
    telemetrySdkName,
    telemetrySdkLanguage,
  } = useApmServiceContext();
  const isAWSLambda = isAWSLambdaAgentName(serverlessType);
  const { dataView, apmIndices } = useAdHocApmDataView();

  const hasDashboardFile = hasDashboard({ agentName, telemetrySdkName, telemetrySdkLanguage });

  const {
    panels: dynamicPanels,
    hasDashboard: hasDynamicDashboard,
    isLoading: isDynamicLoading,
  } = useResolvedPanels({
    agentName,
    dataView,
    serviceName,
    indexPattern: dataView?.getIndexPattern?.(),
  });

  if (isAWSLambda) {
    return <ServerlessMetrics />;
  }

  if (hasDynamicDashboard && dataView && services.dataViews) {
    if (isDynamicLoading) {
      return <EuiLoadingSpinner size="l" />;
    }

    if (dynamicPanels.length > 0) {
      return (
        <DynamicDashboard
          panels={dynamicPanels}
          dataView={dataView}
          dataViewsService={services.dataViews}
        />
      );
    }
  }

  if (!hasDashboardFile && !hasDynamicDashboard && !isElasticAgentName(agentName ?? '')) {
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
