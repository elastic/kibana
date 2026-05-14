/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isElasticAgentName, isJRubyAgentName } from '@kbn/elastic-agent-utils/src/agent_guards';
import { isAWSLambdaAgentName } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { ServerlessMetrics } from './serverless_metrics';
import { ServiceMetrics } from './service_metrics';
import { JsonMetricsDashboard } from './static_dashboard';
import { hasDashboard } from './static_dashboard/helper';
import { JvmMetricsOverview } from './jvm_metrics_overview';
import {
  MixedAgentCallout,
  NoDataForRangeCallout,
  NoDashboardFoundCallout,
} from './metrics_callouts';

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
    return <NoDataForRangeCallout />;
  }

  if (!hasDashboardFile && !isElasticAgentName(agentName ?? '')) {
    return <NoDashboardFoundCallout />;
  }

  const mixedAgentCallout = (
    <MixedAgentCallout
      hasMultipleAgentTypes={hasMultipleAgentTypes}
      ingestionTimeRanges={ingestionTimeRanges}
    />
  );

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
