/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  EdgePayloadMetricsList,
  hasEdgePayloadMetrics,
} from '../../app/service_map/popover/edge_payload_metrics';
import { getEnvironmentLabel } from '../../../../common/environment_filter_values';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { RequestFlyoutFailedCalls } from './failed_calls';
import { RequestFlyoutLatencyDistribution } from './latency_distribution';
import { RequestFlyoutOperations } from './operations';
import { RequestFlyoutRedMetrics } from './red_metrics';
import { useRequestFlyoutContext } from './request_flyout_context';
import { RequestFlyoutResources } from './resources';
import { RequestFlyoutTransactions } from './transactions';

/**
 * Body shared by the flyout of an edge and the flyout of one resource of a grouped edge: the key
 * metrics, then the operations or transactions and the failed calls, or the resources of a grouped
 * edge. Rendered inside the child provider of its flyout level.
 */
export function RequestFlyoutBody() {
  const { connection, filters } = useRequestFlyoutContext();
  const { environment, rangeFrom, rangeTo } = filters;

  const [latencyAggregationType, setLatencyAggregationType] = useState(LatencyAggregationType.avg);

  const hasResources = connection.dependencies.length > 0;
  const isGroupedEdge = !!connection.groupedResources?.length;
  const isServiceToService = !!connection.targetServiceName;

  return (
    <>
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.apm.requestFlyout.inheritedFilters', {
          defaultMessage:
            '{rangeFrom} – {rangeTo} · Environment: {environment} · inherited from the map',
          values: { rangeFrom, rangeTo, environment: getEnvironmentLabel(environment) },
        })}
      </EuiText>

      <EuiSpacer size="m" />

      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.requestFlyout.keyMetricsSectionTitle', {
            defaultMessage: 'Key metrics',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {hasResources ? (
        <>
          <RequestFlyoutRedMetrics
            latencyAggregationType={latencyAggregationType}
            setLatencyAggregationType={setLatencyAggregationType}
          />
          <EuiSpacer size="m" />
          <RequestFlyoutLatencyDistribution />
        </>
      ) : // The metrics are the ones of the exit spans to the resources of the connection. Without
      // resources, only the metrics that came with the map (the AI Agent map) can be shown.
      hasEdgePayloadMetrics(connection.payloadMetrics) ? (
        <EdgePayloadMetricsList metrics={connection.payloadMetrics} />
      ) : (
        <EuiText size="s" color="subdued" data-test-subj="requestFlyoutMetricsNotAvailable">
          {i18n.translate('xpack.apm.requestFlyout.metricsNotAvailable', {
            defaultMessage:
              'Metrics are not available for this connection: the resources it calls are unknown.',
          })}
        </EuiText>
      )}

      <EuiSpacer size="m" />

      {isGroupedEdge ? (
        // Grouped edge: only the list of resources. Their operations and failed calls are in the
        // child flyout of each resource, which keeps the tables small.
        <RequestFlyoutResources />
      ) : (
        <>
          {/* service → dependency: the operations (what the source calls on the dependency).
                service → service: the transactions of the source that call the target. */}
          <EuiTitle size="xs">
            <h3
              data-test-subj={
                isServiceToService
                  ? 'requestFlyoutTransactionsTitle'
                  : 'requestFlyoutOperationsTitle'
              }
            >
              {isServiceToService
                ? i18n.translate('xpack.apm.requestFlyout.transactionsTitle', {
                    defaultMessage: 'Transactions',
                  })
                : i18n.translate('xpack.apm.requestFlyout.operationsTitle', {
                    defaultMessage: 'Operations',
                  })}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {isServiceToService
              ? i18n.translate('xpack.apm.requestFlyout.transactionsCaption', {
                  defaultMessage: '{source} transactions that call {target}',
                  values: { source: connection.sourceLabel, target: connection.targetLabel },
                })
              : i18n.translate('xpack.apm.requestFlyout.operationsCaption', {
                  defaultMessage: 'What {source} calls on {target}',
                  values: { source: connection.sourceLabel, target: connection.targetLabel },
                })}
          </EuiText>
          <EuiSpacer size="s" />

          {isServiceToService ? <RequestFlyoutTransactions /> : <RequestFlyoutOperations />}

          <EuiSpacer size="l" />

          <RequestFlyoutFailedCalls />
        </>
      )}
    </>
  );
}
