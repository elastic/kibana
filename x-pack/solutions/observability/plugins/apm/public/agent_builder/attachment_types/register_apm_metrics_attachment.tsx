/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiBadge,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  APM_METRICS_ATTACHMENT_TYPE,
  type ApmMetricsAttachmentData,
} from '../../../common/agent_builder/attachments';

type ApmMetricsAttachment = Attachment<typeof APM_METRICS_ATTACHMENT_TYPE, ApmMetricsAttachmentData>;

function formatLatency(ms?: number): string {
  if (ms == null) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function formatErrorRate(rate?: number): string {
  if (rate == null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

function formatThroughput(rpm?: number): string {
  if (rpm == null) return '—';
  return `${rpm.toFixed(1)} rpm`;
}

function DeltaBadge({ current, baseline, higherIsBetter = false }: {
  current?: number;
  baseline?: number;
  higherIsBetter?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  if (current == null || baseline == null || baseline === 0) return null;

  const delta = ((current - baseline) / baseline) * 100;
  const isWorse = higherIsBetter ? delta < -5 : delta > 5;
  const isBetter = higherIsBetter ? delta > 5 : delta < -5;
  const label = `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`;

  return (
    <EuiBadge
      color={isWorse ? 'danger' : isBetter ? 'success' : 'hollow'}
      css={css`margin-left: ${euiTheme.size.xs};`}
    >
      {label} vs baseline
    </EuiBadge>
  );
}

function ApmMetricsCard({ data }: { data: ApmMetricsAttachmentData }) {
  const { current, baseline, serviceName, environment, title } = data;

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiTitle size="xs">
        <h4>
          {title ??
            i18n.translate('xpack.apm.agentBuilder.attachments.apmMetrics.defaultTitle', {
              defaultMessage: 'APM Metrics — {serviceName}',
              values: { serviceName },
            })}
        </h4>
      </EuiTitle>
      {environment && (
        <EuiText size="xs" color="subdued">
          <p>{environment}</p>
        </EuiText>
      )}
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
          <EuiStat
            title={formatLatency(current.latencyMs)}
            description={i18n.translate(
              'xpack.apm.agentBuilder.attachments.apmMetrics.latency',
              { defaultMessage: 'Avg Latency' }
            )}
            titleColor={
              current.latencyMs != null &&
              baseline?.latencyMs != null &&
              current.latencyMs > baseline.latencyMs * 1.1
                ? 'danger'
                : 'default'
            }
          >
            <DeltaBadge
              current={current.latencyMs}
              baseline={baseline?.latencyMs}
              higherIsBetter={false}
            />
          </EuiStat>
        </EuiFlexItem>

        <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
          <EuiStat
            title={formatErrorRate(current.errorRate)}
            description={i18n.translate(
              'xpack.apm.agentBuilder.attachments.apmMetrics.errorRate',
              { defaultMessage: 'Error Rate' }
            )}
            titleColor={
              current.errorRate != null && current.errorRate > 0.05 ? 'danger' : 'default'
            }
          >
            <DeltaBadge
              current={current.errorRate}
              baseline={baseline?.errorRate}
              higherIsBetter={false}
            />
          </EuiStat>
        </EuiFlexItem>

        <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
          <EuiStat
            title={formatThroughput(current.throughputRpm)}
            description={i18n.translate(
              'xpack.apm.agentBuilder.attachments.apmMetrics.throughput',
              { defaultMessage: 'Throughput' }
            )}
          >
            <DeltaBadge
              current={current.throughputRpm}
              baseline={baseline?.throughputRpm}
              higherIsBetter={true}
            />
          </EuiStat>
        </EuiFlexItem>
      </EuiFlexGroup>

      {baseline && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.apm.agentBuilder.attachments.apmMetrics.baselineLabel', {
                defaultMessage: 'Baseline: {latency} latency · {errorRate} errors · {throughput}',
                values: {
                  latency: formatLatency(baseline.latencyMs),
                  errorRate: formatErrorRate(baseline.errorRate),
                  throughput: formatThroughput(baseline.throughputRpm),
                },
              })}
            </p>
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
}

export const registerApmMetricsAttachment = (attachments: AttachmentServiceStartContract) => {
  attachments.addAttachmentType<ApmMetricsAttachment>(APM_METRICS_ATTACHMENT_TYPE, {
    getLabel: (attachment) =>
      attachment.data?.title ??
      i18n.translate('xpack.apm.agentBuilder.attachments.apmMetrics.label', {
        defaultMessage: 'APM Metrics',
      }),
    getIcon: () => 'visMetric',
    renderInlineContent: ({ attachment }) => {
      return <ApmMetricsCard data={attachment.data} />;
    },
  });
};
