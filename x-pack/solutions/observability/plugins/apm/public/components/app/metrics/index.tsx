/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { isElasticAgentName, isJRubyAgentName } from '@kbn/elastic-agent-utils/src/agent_guards';
import { isAWSLambdaAgentName } from '../../../../common/agent_name';
import type { IngestionTimeRanges } from '../../../../common/metrics_types';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useServiceMixedIngestionFetcher } from '../../../hooks/use_service_mixed_ingestion_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
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
    serviceName,
    agentName,
    runtimeName,
    runtimeVersion,
    serverlessType,
    telemetrySdkName,
    telemetrySdkLanguage,
    serviceAgentStatus,
  } = useApmServiceContext();

  const {
    query: { environment, rangeFrom, rangeTo, kuery },
  } = useApmParams('/services/{serviceName}/metrics');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data: mixedIngestionData } = useServiceMixedIngestionFetcher({
    serviceName,
    environment,
    kuery,
    start,
    end,
  });

  const hasMultipleAgentTypes = mixedIngestionData?.hasMultipleAgentTypes ?? false;
  const ingestionTimeRanges = mixedIngestionData?.ingestionTimeRanges;

  const isAWSLambda = isAWSLambdaAgentName(serverlessType);
  const { dataView, apmIndices } = useAdHocApmDataView();

  const [forcedIngestionType, setForcedIngestionType] = useState<IngestionType | null>(null);
  const isInternalNavigationRef = useRef(false);

  const snapshotTimeRanges = useMemo<IngestionTimeRanges | undefined>(() => {
    if (forcedIngestionType !== null) {
      return undefined;
    }
    return ingestionTimeRanges;
  }, [forcedIngestionType, ingestionTimeRanges]);

  const snapshotTimeRangesRef = useRef(snapshotTimeRanges);
  if (snapshotTimeRanges !== undefined) {
    snapshotTimeRangesRef.current = snapshotTimeRanges;
  }

  const prevFiltersRef = useRef({ rangeFrom, rangeTo, environment, kuery });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const rangeChanged = prev.rangeFrom !== rangeFrom || prev.rangeTo !== rangeTo;
    const filtersChanged = prev.environment !== environment || prev.kuery !== kuery;

    if (rangeChanged || filtersChanged) {
      if (rangeChanged && isInternalNavigationRef.current) {
        isInternalNavigationRef.current = false;
      } else if (forcedIngestionType !== null) {
        setForcedIngestionType(null);
        snapshotTimeRangesRef.current = undefined;
      }
      prevFiltersRef.current = { rangeFrom, rangeTo, environment, kuery };
    }
  }, [rangeFrom, rangeTo, environment, kuery, forcedIngestionType]);

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

  const mixedAgentCallout = (hasMultipleAgentTypes || forcedIngestionType !== null) && (
    <MixedAgentCallout
      ingestionTimeRanges={calloutTimeRanges}
      forcedIngestionType={forcedIngestionType}
      onNavigateToIngestionType={handleNavigateToIngestionType}
    />
  );

  if (hasDashboardFile && dataView) {
    return (
      <>
        {mixedAgentCallout}
        {mixedAgentCallout && <EuiSpacer size="m" />}
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
        {mixedAgentCallout && <EuiSpacer size="m" />}
        <JvmMetricsOverview />
      </>
    );
  }

  return (
    <>
      {mixedAgentCallout}
      {mixedAgentCallout && <EuiSpacer size="m" />}
      <ServiceMetrics />
    </>
  );
}
