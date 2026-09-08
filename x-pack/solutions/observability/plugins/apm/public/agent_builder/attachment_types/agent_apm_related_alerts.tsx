/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  AlertItem,
  ApmRelatedAlertsAttachmentData,
} from '../../../common/agent_builder/attachments';

export interface AgentApmRelatedAlertsProps {
  data?: ApmRelatedAlertsAttachmentData;
}

// Relative path to alert details page (basePath is prepended via useKibana).
function getAlertDetailsPath(alertId: string) {
  return `/app/observability/alerts/${encodeURIComponent(alertId)}`;
}

/** Exported pure helper for unit tests */
export function formatAlertDuration(startMs: number, durationMs?: number): string {
  const durationSec = durationMs != null ? durationMs / 1000 : (Date.now() - startMs) / 1000;
  if (durationSec < 60) return `${Math.round(durationSec)}s`;
  const minutes = Math.floor(durationSec / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return remainingMin > 0 ? `${hours}h ${remainingMin}m` : `${hours}h`;
}

export function AgentApmRelatedAlerts({ data }: AgentApmRelatedAlertsProps) {
  const { services } = useKibana<{ http?: { basePath?: { prepend: (path: string) => string } } }>();
  const prepend = services.http?.basePath?.prepend ?? ((p: string) => p);

  if (!data) {
    return null;
  }

  const { alerts, serviceName, title } = data;

  const displayTitle =
    title ??
    i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.defaultTitle', {
      defaultMessage: 'Related Alerts — {serviceName}',
      values: { serviceName },
    });

  if (alerts.length === 0) {
    return (
      <EuiPanel hasBorder>
        <EuiTitle size="xs">
          <h4>{displayTitle}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiEmptyPrompt
          iconType="checkInCircleFilled"
          iconColor="success"
          title={
            <h5>
              {i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.noAlerts', {
                defaultMessage: 'No active alerts',
              })}
            </h5>
          }
          body={
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.noAlertsBody', {
                defaultMessage: 'No active or recently recovered alerts for {serviceName}.',
                values: { serviceName },
              })}
            </EuiText>
          }
        />
      </EuiPanel>
    );
  }

  const columns = [
    {
      name: i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.statusColumn', {
        defaultMessage: 'Status',
      }),
      field: 'status' as const,
      width: '100px',
      render: (status: AlertItem['status']) => (
        <EuiHealth color={status === 'active' ? 'danger' : 'success'}>
          {status === 'active'
            ? i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.active', {
                defaultMessage: 'Active',
              })
            : i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.recovered', {
                defaultMessage: 'Recovered',
              })}
        </EuiHealth>
      ),
    },
    {
      name: i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.ruleColumn', {
        defaultMessage: 'Rule',
      }),
      field: 'ruleName' as const,
      render: (ruleName: string, alert: AlertItem) => (
        <EuiLink
          data-test-subj="apmColumnsLink"
          href={prepend(getAlertDetailsPath(alert.id))}
          target="_blank"
          external
        >
          {ruleName}
        </EuiLink>
      ),
    },
    {
      name: i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.reasonColumn', {
        defaultMessage: 'Reason',
      }),
      field: 'reason' as const,
      render: (reason?: string) => (
        <EuiText size="s" color="subdued">
          {reason ?? '—'}
        </EuiText>
      ),
    },
    {
      name: i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.durationColumn', {
        defaultMessage: 'Duration',
      }),
      field: 'start' as const,
      width: '90px',
      render: (start: number, alert: AlertItem) => (
        <EuiText size="s">{formatAlertDuration(start, alert.duration)}</EuiText>
      ),
    },
  ];

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h4>{displayTitle}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.count', {
              defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
              values: { count: alerts.length },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable<AlertItem>
        tableCaption={displayTitle}
        items={alerts}
        itemId="id"
        columns={columns}
        compressed
      />
    </EuiPanel>
  );
}
