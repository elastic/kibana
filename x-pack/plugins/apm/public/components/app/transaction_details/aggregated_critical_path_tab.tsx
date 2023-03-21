/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { CriticalPathFlamegraph } from '../../shared/critical_path_flamegraph';
import { TechnicalPreviewBadge } from '../../shared/technical_preview_badge';
import { TabContentProps } from './transaction_details_tabs';

function TransactionDetailAggregatedCriticalPath({
  traceSamplesFetchResult,
}: TabContentProps) {
  const {
    path: { serviceName },
    query: { rangeFrom, rangeTo, transactionName },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const traceIds = useMemo(() => {
    return (
      traceSamplesFetchResult.data?.traceSamples.map(
        (sample) => sample.traceId
      ) ?? []
    );
  }, [traceSamplesFetchResult.data]);

  return (
    <CriticalPathFlamegraph
      start={start}
      end={end}
      traceIdsFetchStatus={traceSamplesFetchResult.status}
      traceIds={traceIds}
      serviceName={serviceName}
      transactionName={transactionName}
    />
  );
}

export const aggregatedCriticalPathTab = {
  dataTestSubj: 'apmAggregatedCriticalPathTabButton',
  key: 'aggregatedCriticalPath',
  label: (
    <EuiFlexGroup gutterSize="s" direction="row">
      <EuiFlexItem grow={false}>
        {i18n.translate(
          'xpack.apm.transactionDetails.tabs.aggregatedCriticalPathLabel',
          {
            defaultMessage: 'Aggregated critical path',
          }
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <TechnicalPreviewBadge
          icon="beaker"
          size="s"
          style={{ verticalAlign: 'middle' }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
  component: TransactionDetailAggregatedCriticalPath,
};
