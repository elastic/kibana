/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import React from 'react';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { i18n } from '@kbn/i18n';
import { AgentIcon } from '@kbn/custom-icons';
import type { CriticalPathResponse } from '../../../../server/routes/traces/get_aggregated_critical_path';
import {
  AGENT_NAME,
  SERVICE_NAME,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { SpanIcon } from '../span_icon';
import { asPercent } from '../../../../common/utils/formatters';

export function CriticalPathFlamegraphTooltip({
  metadata,
  countInclusive,
  countExclusive,
  totalCount,
}: {
  metadata?: CriticalPathResponse['metadata'][string];
  countInclusive: number;
  countExclusive: number;
  totalCount: number;
}) {
  if (!metadata) {
    return <></>;
  }

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        {metadata['processor.event'] === ProcessorEvent.transaction ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="row"
              gutterSize="s"
              style={{ overflowWrap: 'anywhere' }}
              alignItems="center"
            >
              <EuiFlexItem grow={false}>{metadata[TRANSACTION_NAME]}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge>{metadata[TRANSACTION_TYPE]}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiFlexGroup
              direction="row"
              gutterSize="s"
              style={{ overflowWrap: 'anywhere' }}
              alignItems="center"
            >
              <EuiFlexItem grow={false}>
                <SpanIcon
                  type={metadata[SPAN_TYPE]}
                  subtype={metadata[SPAN_SUBTYPE]}
                  role="presentation"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{metadata[SPAN_NAME]}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <AgentIcon agentName={metadata[AGENT_NAME]} size="l" role="presentation" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{metadata[SERVICE_NAME]}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.apm.criticalPathFlameGraph.selfTime', {
                defaultMessage: 'Self time: {value}',
                values: {
                  value: asPercent(countExclusive / totalCount, 1),
                },
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.apm.criticalPathFlameGraph.totalTime', {
                defaultMessage: 'Total time: {value}',
                values: {
                  value: asPercent(countInclusive / totalCount, 1),
                },
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
