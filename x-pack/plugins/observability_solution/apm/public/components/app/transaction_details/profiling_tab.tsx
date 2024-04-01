/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { ProfilingEmptyState } from '@kbn/observability-shared-plugin/public';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { ProfilingFlamegraph } from '../../shared/profiling/flamegraph';
import { ProfilingTopNFunctions } from '../../shared/profiling/top_functions';

function ProfilingTab() {
  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      transactionName,
      transactionType,
    },
    path: { serviceName },
  } = useApmParams('/services/{serviceName}/transactions/view');
  const { isProfilingAvailable, isLoading } = useProfilingPlugin();

  const tabs = useMemo((): EuiTabbedContentProps['tabs'] => {
    return [
      {
        id: 'flamegraph',
        name: i18n.translate(
          'xpack.apm.transactions.profiling.tabs.flamegraph',
          { defaultMessage: 'Flamegraph' }
        ),
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
            />
          </>
        ),
      },
      {
        id: 'topNFunctions',
        name: i18n.translate(
          'xpack.apm.transactions.profiling.tabs.topNFunctions',
          { defaultMessage: 'Top 10 Functions' }
        ),
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
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
    />
  );
}

export const profilingTab = {
  dataTestSubj: 'apmProfilingTabButton',
  key: 'Profiling',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.ProfilingLabel', {
    defaultMessage: 'Universal Profiling',
  }),
  component: ProfilingTab,
};
