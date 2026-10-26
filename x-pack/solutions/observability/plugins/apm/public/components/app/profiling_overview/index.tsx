/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTabbedContentProps } from '@elastic/eui';
import { EuiLoadingSpinner, EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  ProfilingEmptyState,
  useProfilingSchemaState,
} from '@kbn/observability-shared-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isJavaAgentName as getIsJavaAgentName } from '../../../../common/agent_name';
import { ApmDocumentType } from '../../../../common/document_type';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ProfilingFlamegraph } from '../../shared/profiling/flamegraph';
import { ProfilingSchemaSelector } from '../../shared/profiling/schema_selector';
import { ProfilingTopNFunctions } from '../../shared/profiling/top_functions';
import { ProfilingHostsCallout } from './profiling_hosts_callout';
import { ProfilingHostsFlamegraph } from './profiling_hosts_flamegraph';
import { ProfilingHostsSchemaSelector } from './profiling_hosts_schema_selector';
import { ProfilingHostsTopNFunctions } from './profiling_hosts_top_functions';

export { ProfilingHeaderSearchBar } from './profiling_header_search_bar';

export function ProfilingOverview() {
  const {
    path: { serviceName },
    query: { rangeFrom, rangeTo, environment, kuery },
  } = useApmParams('/services/{serviceName}/profiling');
  const { isProfilingAvailable, isLoading } = useProfilingPlugin();
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.TransactionMetric,
    numBuckets: 20,
  });

  const { agentName, transactionType } = useApmServiceContext();
  const isJavaAgent = getIsJavaAgentName(agentName);
  const { schema } = useProfilingSchemaState();

  // Tracks whether the Java service's transactions returned no profiling samples, causing the
  // host-scoped fallback to render. Reset whenever the query inputs change so that a new time
  // range, environment, or schema can reveal transaction-linked samples again — the child's
  // useEffect will re-trigger onJavaFallback if the fallback is still needed.
  const [javaFallbackActive, setJavaFallbackActive] = useState(false);
  const onJavaFallback = useCallback(() => setJavaFallbackActive(true), []);
  useEffect(() => {
    setJavaFallbackActive(false);
  }, [start, end, environment, kuery, schema, transactionType]);

  const tabs = useMemo((): EuiTabbedContentProps['tabs'] => {
    // Host-scoped views are the default for non-Java agents and the fallback for Java agents
    // whose transactions carry no profiler stack-trace ids (e.g. upstream OpenTelemetry Java).
    const hostsFlamegraph = (
      <ProfilingHostsFlamegraph
        serviceName={serviceName}
        start={start}
        end={end}
        environment={environment}
        dataSource={preferred?.source}
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        schema={schema}
      />
    );
    const hostsTopNFunctions = (
      <ProfilingHostsTopNFunctions
        serviceName={serviceName}
        start={start}
        end={end}
        environment={environment}
        startIndex={0}
        endIndex={10}
        dataSource={preferred?.source}
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        schema={schema}
      />
    );

    return [
      {
        id: 'flamegraph',
        name: i18n.translate('xpack.apm.profiling.tabs.flamegraph', {
          defaultMessage: 'Flamegraph',
        }),
        content: (
          <>
            <EuiSpacer />
            {isJavaAgent ? (
              <ProfilingFlamegraph
                serviceName={serviceName}
                kuery={kuery}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                environment={environment}
                transactionType={transactionType}
                schema={schema}
                fallback={hostsFlamegraph}
                onFallback={onJavaFallback}
              />
            ) : (
              hostsFlamegraph
            )}
          </>
        ),
      },
      {
        id: 'topNFunctions',
        name: i18n.translate('xpack.apm.profiling.tabs.topNFunctions', {
          defaultMessage: 'Top 10 Functions',
        }),
        content: (
          <>
            <EuiSpacer />
            {isJavaAgent ? (
              <ProfilingTopNFunctions
                serviceName={serviceName}
                kuery={kuery}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                environment={environment}
                transactionType={transactionType}
                schema={schema}
                fallback={hostsTopNFunctions}
                onFallback={onJavaFallback}
              />
            ) : (
              hostsTopNFunctions
            )}
          </>
        ),
      },
    ];
  }, [
    end,
    environment,
    isJavaAgent,
    kuery,
    onJavaFallback,
    preferred?.source,
    rangeFrom,
    rangeTo,
    schema,
    serviceName,
    start,
    transactionType,
  ]);

  if (isLoading) {
    return (
      <div
        css={css`
          display: flex;
          justify-content: center;
        `}
      >
        <EuiLoadingSpinner size="m" />
      </div>
    );
  }

  if (isProfilingAvailable === false) {
    return <ProfilingEmptyState />;
  }

  return (
    <>
      {!isJavaAgent && (
        <>
          <ProfilingHostsCallout serviceName={serviceName} />
          <EuiSpacer />
        </>
      )}
      {/* Java agents record the profiler stacktrace IDs of each transaction, so their profiling
      data and schemas with data come from the service's transactions — unless the Java service
      has no stack-trace IDs (e.g. upstream OTel Java), in which case the host-scoped fallback
      renders and the hosts schema selector is used instead (javaFallbackActive). */}
      {isJavaAgent && !javaFallbackActive ? (
        <ProfilingSchemaSelector
          serviceName={serviceName}
          start={start}
          end={end}
          environment={environment}
          kuery={kuery}
          transactionType={transactionType}
        />
      ) : (
        <ProfilingHostsSchemaSelector
          serviceName={serviceName}
          start={start}
          end={end}
          environment={environment}
          dataSource={preferred?.source}
          kuery={kuery}
        />
      )}
      <EuiSpacer />
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
    </>
  );
}
