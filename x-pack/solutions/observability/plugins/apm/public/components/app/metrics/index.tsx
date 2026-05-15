/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { isElasticAgentName, isJRubyAgentName } from '@kbn/elastic-agent-utils/src/agent_guards';
import { isAWSLambdaAgentName } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { useApmParams } from '../../../hooks/use_apm_params';
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
import type { IngestionType } from './metrics_callouts';

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

  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/metrics');

  const isAWSLambda = isAWSLambdaAgentName(serverlessType);
  const { dataView, apmIndices } = useAdHocApmDataView();

  const [forcedIngestionType, setForcedIngestionType] = useState<IngestionType | null>(null);
  const isInternalNavigationRef = useRef(false);
  const snapshotTimeRangesRef = useRef(ingestionTimeRanges);

  if (forcedIngestionType === null && ingestionTimeRanges) {
    snapshotTimeRangesRef.current = ingestionTimeRanges;
  }

  const prevRangeRef = useRef({ rangeFrom, rangeTo });
  useEffect(() => {
    const prev = prevRangeRef.current;
    if (prev.rangeFrom !== rangeFrom || prev.rangeTo !== rangeTo) {
      if (isInternalNavigationRef.current) {
        isInternalNavigationRef.current = false;
      } else if (forcedIngestionType !== null) {
        setForcedIngestionType(null);
        snapshotTimeRangesRef.current = undefined;
      }
      prevRangeRef.current = { rangeFrom, rangeTo };
    }
  }, [rangeFrom, rangeTo, forcedIngestionType]);

  const handleNavigateToIngestionType = useCallback((type: IngestionType) => {
    isInternalNavigationRef.current = true;
    setForcedIngestionType(type);
  }, []);

  const calloutTimeRanges =
    forcedIngestionType !== null ? snapshotTimeRangesRef.current : ingestionTimeRanges;

  const isForced = forcedIngestionType !== null && hasMultipleAgentTypes && ingestionTimeRanges;

  const effectiveAgentFields = isForced
    ? {
        agentName,
        telemetrySdkName: forcedIngestionType === 'otelNative' ? telemetrySdkName : undefined,
        telemetrySdkLanguage:
          forcedIngestionType === 'otelNative' ? telemetrySdkLanguage : undefined,
        runtimeName,
        runtimeVersion,
      }
    : { agentName, telemetrySdkName, telemetrySdkLanguage, runtimeName, runtimeVersion };

  const hasDashboardFile = hasDashboard(effectiveAgentFields);

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
      hasMultipleAgentTypes={hasMultipleAgentTypes || forcedIngestionType !== null}
      ingestionTimeRanges={calloutTimeRanges}
      forcedIngestionType={forcedIngestionType}
      onNavigateToIngestionType={handleNavigateToIngestionType}
    />
  );

  if (hasDashboardFile && dataView) {
    return (
      <>
        {mixedAgentCallout}
        <JsonMetricsDashboard
          agentName={effectiveAgentFields.agentName}
          telemetrySdkName={effectiveAgentFields.telemetrySdkName}
          telemetrySdkLanguage={effectiveAgentFields.telemetrySdkLanguage}
          runtimeName={effectiveAgentFields.runtimeName}
          runtimeVersion={effectiveAgentFields.runtimeVersion}
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
