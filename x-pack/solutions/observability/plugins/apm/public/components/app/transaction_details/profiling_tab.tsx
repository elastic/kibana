/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiTabbedContentProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import {
  ProfilingEmptyState,
  ProfilingSchemaStateProvider,
  useProfilingSchemaState,
} from '@kbn/observability-shared-plugin/public';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ProfilingFlamegraph } from '../../shared/profiling/flamegraph';
import { ProfilingSchemaSelector } from '../../shared/profiling/schema_selector';
import { ProfilingTopNFunctions } from '../../shared/profiling/top_functions';

function ProfilingTabContent() {
  const {
    query: { rangeFrom, rangeTo, environment, kuery, transactionName, transactionType },
    path: { serviceName },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );
  const { isProfilingAvailable, isLoading } = useProfilingPlugin();
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { schema } = useProfilingSchemaState();

  const tabs = useMemo((): EuiTabbedContentProps['tabs'] => {
    return [
      {
        id: 'flamegraph',
        name: i18n.translate('xpack.apm.transactions.profiling.tabs.flamegraph', {
          defaultMessage: 'Flamegraph',
        }),
        content: (
          <>
            <EuiSpacer />
            <ProfilingFlamegraph
              serviceName={serviceName}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              kuery={kuery}
              transactionName={transactionName}
              transactionType={transactionType}
              environment={environment}
              schema={schema}
            />
          </>
        ),
      },
      {
        id: 'topNFunctions',
        name: i18n.translate('xpack.apm.transactions.profiling.tabs.topNFunctions', {
          defaultMessage: 'Top 10 Functions',
        }),
        content: (
          <>
            <EuiSpacer />
            <ProfilingTopNFunctions
              serviceName={serviceName}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              kuery={kuery}
              transactionName={transactionName}
              transactionType={transactionType}
              environment={environment}
              schema={schema}
            />
          </>
        ),
      },
    ];
  }, [
    environment,
    kuery,
    rangeFrom,
    rangeTo,
    schema,
    serviceName,
    transactionName,
    transactionType,
  ]);

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isProfilingAvailable === false) {
    return <ProfilingEmptyState />;
  }

  return (
    <>
      <EuiSpacer />
      <ProfilingSchemaSelector
        serviceName={serviceName}
        start={start}
        end={end}
        environment={environment}
        kuery={kuery}
        transactionName={transactionName}
        transactionType={transactionType}
      />
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
    </>
  );
}

function ProfilingTab() {
  return (
    <ProfilingSchemaStateProvider>
      <ProfilingTabContent />
    </ProfilingSchemaStateProvider>
  );
}

export const profilingTab = {
  dataTestSubj: 'apmProfilingTabButton',
  key: 'Profiling',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.ProfilingLabel', {
    defaultMessage: 'Profiling',
  }),
  component: ProfilingTab,
};
