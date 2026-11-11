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
import { asDuration, asPercent } from '../../../../common/utils/formatters';
import { getFailureLevel, useFailureTextColor } from './failure_level';

/**
 * A node's failure rate and latency on one line, the failure rate coloured by how serious it is.
 */
export function NodeStatsLine({ stats }: { stats?: ServiceMapServiceStats }) {
  const { euiTheme } = useEuiTheme();
  const level = getFailureLevel(stats?.failedTransactionRate, stats?.requestCount);
  const failureTextColor = useFailureTextColor(level);
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
      css={css`
        white-space: nowrap;
        pointer-events: none;
        /* Soft plate behind the numbers so edges stay readable over connectors (same idea as NodeLabel). */
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-radius: ${euiTheme.border.radius.medium};
        padding: 0 ${euiTheme.size.xs};
      `}
      data-test-subj="serviceMapNodeStats"
    >
      {parts.flatMap((part, index) => (index === 0 ? [part] : [' · ', part]))}
    </EuiText>
  );
}
