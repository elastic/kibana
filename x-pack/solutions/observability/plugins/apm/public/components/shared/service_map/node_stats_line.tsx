/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ServiceMapServiceStats } from '@kbn/apm-types';
import type { AggregatedServiceMapStats } from '../../../../common/service_map';
import { asDuration, asPercent } from '../../../../common/utils/formatters';
import { formatCompactRate, getFailureLevel } from './failure_ring';
import { textHaloStyles } from './text_halo';

type NodeStatsLineStats = AggregatedServiceMapStats | ServiceMapServiceStats;

/**
 * A node's failure rate and latency on one line, the failure rate coloured by how serious it is.
 * Groups, whose centre shows their number of services, also show their requests here.
 */
export function NodeStatsLine({
  stats,
  showRequests = false,
}: {
  stats?: NodeStatsLineStats;
  showRequests?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const level = getFailureLevel(stats?.failedTransactionRate, stats?.requestCount);
  // Text-safe tokens (not ring fill colours) so xs failure labels keep readable contrast.
  let failureTextColor: string | undefined;
  if (level === 'danger') {
    failureTextColor = euiTheme.colors.textDanger;
  } else if (level === 'warning') {
    failureTextColor = euiTheme.colors.textWarning;
  }
  if (!stats) {
    return null;
  }

  const failed =
    typeof stats.failedTransactionRate === 'number' && stats.failedTransactionRate > 0
      ? i18n.translate('xpack.apm.serviceMap.node.failedShare', {
          defaultMessage: '{share} failed',
          values: { share: asPercent(stats.failedTransactionRate, 1) },
        })
      : undefined;
  const parts: React.ReactNode[] = [];
  if (showRequests && stats.throughput !== undefined) {
    parts.push(<span key="requests">{formatCompactRate(stats.throughput)}</span>);
  }
  if (failed) {
    parts.push(
      <span
        key="failed"
        data-test-subj="serviceMapNodeFailedShare"
        css={
          failureTextColor
            ? css`
                color: ${failureTextColor};
                font-weight: ${euiTheme.font.weight.bold};
              `
            : undefined
        }
      >
        {failed}
      </span>
    );
  }
  if (typeof stats.latency === 'number') {
    parts.push(<span key="latency">{asDuration(stats.latency)}</span>);
  }
  if (parts.length === 0) {
    return null;
  }

  return (
    <EuiText
      size="xs"
      color="subdued"
      css={[
        css`
          white-space: nowrap;
          pointer-events: none;
        `,
        textHaloStyles(euiTheme.colors.backgroundBasePlain),
      ]}
      data-test-subj="serviceMapNodeStats"
    >
      {parts.flatMap((part, index) => (index === 0 ? [part] : [' · ', part]))}
    </EuiText>
  );
}
