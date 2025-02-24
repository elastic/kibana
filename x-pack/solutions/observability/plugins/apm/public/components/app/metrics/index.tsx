/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isElasticAgentName } from '@kbn/elastic-agent-utils/src/agent_guards';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isAWSLambdaAgentName } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ServerlessMetrics } from './serverless_metrics';
import { ServiceMetrics } from './service_metrics';
import { JsonMetricsDashboard } from './static_dashboard';
import { hasDashboard } from './static_dashboard/helper';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { isLogsOnlySignal } from '../../../utils/get_signal_type';
import { ServiceTabEmptyState } from '../service_tab_empty_state';

export function Metrics() {
  const { agentName, runtimeName, serverlessType, serviceEntitySummary, hasOpenTelemetryFields } =
    useApmServiceContext();
  const isAWSLambda = isAWSLambdaAgentName(serverlessType);
  const { dataView } = useAdHocApmDataView();

  const hasLogsOnlySignal =
    serviceEntitySummary?.dataStreamTypes && isLogsOnlySignal(serviceEntitySummary.dataStreamTypes);

  if (hasLogsOnlySignal) {
    return <ServiceTabEmptyState id="metrics" />;
  }

  if (isAWSLambda) {
    return <ServerlessMetrics />;
  }

  if (
    !hasDashboard({ agentName, hasOpenTelemetryFields }) &&
    !isElasticAgentName(agentName ?? '')
  ) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.apm.metrics.emptyState.title', {
          defaultMessage: 'No dashboard found',
        })}
        iconType="iInCircle"
      />
    );
  }

  if (hasDashboard({ agentName, hasOpenTelemetryFields }) && dataView) {
    return (
      <JsonMetricsDashboard
        agentName={agentName}
        runtimeName={runtimeName}
        serverlessType={serverlessType}
        dataView={dataView}
      />
    );
  }

  return <ServiceMetrics />;
}
