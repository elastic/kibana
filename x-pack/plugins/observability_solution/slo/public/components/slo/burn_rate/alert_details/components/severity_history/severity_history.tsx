/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { GetSLOResponse } from '@kbn/slo-schema';
import { css, keyframes } from '@emotion/react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiBackgroundColorCSS,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { BurnRateAlert } from '../../alert_details_app_section';
import { InstanceHistoryRecord } from '../../../../../../../common/types';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../../../../../common/constants';

const IMPROVING_LABEL = i18n.translate(
  'xpack.slo.burnRateRule.alertDetailsAppSection.severityHistory.improvingLabel',
  { defaultMessage: 'Improving' }
);

const DEGRADING_LABEL = i18n.translate(
  'xpack.slo.burnRateRule.alertDetailsAppSection.severityHistory.degradingLabel',
  { defaultMessage: 'Degrading' }
);

interface SeverityHistoryProps {
  alert: BurnRateAlert;
  slo?: GetSLOResponse;
  isLoading: boolean;
}

interface HistoryItem {
  severity: string;
  startedAt: Date;
  endedAt: Date | null;
  status: string;
  durationInMs: number;
  suppressed?: boolean;
}

export function SeverityHistory({ alert, slo, isLoading }: SeverityHistoryProps) {
  const dateFormat = useUiSetting<string>('dateFormat');
  const colorStyles = useEuiBackgroundColorCSS();

  const getRowProps = useCallback(
    (item: HistoryItem) => {
      if (!item.endedAt && alert.active) {
        const pulse = keyframes`
        0%, 100% {
          background-color: #fff;
        }
        50% {
         ${colorStyles.danger};
        }
      `;
        return {
          css: css`
            animation: ${pulse} 2s infinite;
          `,
        };
      }

      return {};
    },
    [alert, colorStyles]
  );

  const cellRenderForStartedAt = useCallback(
    (startedAt: Date) => moment(startedAt).format(dateFormat),
    [dateFormat]
  );

  const cellRenderForEndedAt = useCallback(
    (endedAt: Date | null) => {
      if (endedAt == null && !alert.active) {
        return moment(alert.lastUpdated).format(dateFormat);
      }
      if (endedAt == null) {
        return (
          <EuiBadge color="danger">
            {i18n.translate(
              'xpack.slo.burnRateRule.alertDetailsAppSection.severityHistory.activeBadgeLabel',
              {
                defaultMessage: 'Active',
              }
            )}
          </EuiBadge>
        );
      }
      return moment(endedAt).format(dateFormat);
    },
    [alert, dateFormat]
  );

  if (isLoading) {
    return null;
  }
  if (!slo) {
    return null;
  }

  const history: InstanceHistoryRecord[] =
    (alert.fields['slo.serverityHistory'] as InstanceHistoryRecord[]) ||
    ([] as InstanceHistoryRecord[]);

  const items: HistoryItem[] = history.map((event) => {
    const isImproving = event.improvingFrom != null;
    const from = event.timerange.from;
    const to = event.timerange.to ?? Date.now();
    return {
      severity: event.actionGroup,
      startedAt: new Date(from),
      endedAt: to !== Date.now() ? new Date(to) : null,
      status: isImproving ? IMPROVING_LABEL : DEGRADING_LABEL,
      durationInMs: to - from,
      suppressed: event.suppressed,
    };
  });

  const columns: Array<EuiBasicTableColumn<HistoryItem>> = [
    {
      field: 'status',
      name: 'Status',
      render: (status: string, record: HistoryItem) => {
        if (record.suppressed) {
          return (
            <EuiBadge>
              <FormattedMessage
                id="xpack.slo.burnRateRule.alertDetailsAppSection.severityHistory.suppressedLabel"
                defaultMessage="Suppressed"
              />
            </EuiBadge>
          );
        }
        return (
          <EuiBadge color={status === DEGRADING_LABEL ? 'warning' : 'success'}>{status}</EuiBadge>
        );
      },
    },
    {
      field: 'severity',
      name: 'Severity',
      render: (actionGroup: string) => {
        return (
          <EuiBadge color={getSeverityColorByActionGroup(actionGroup)}>
            {getSeverityLabelByActionGroup(actionGroup)}
          </EuiBadge>
        );
      },
    },
    {
      field: 'durationInMs',
      name: 'Duration',
      render: (durationInMs: number) => (
        <strong>{moment.duration(durationInMs, 'ms').humanize()}</strong>
      ),
    },
    {
      field: 'startedAt',
      name: 'Started at',
      render: cellRenderForStartedAt,
    },
    {
      field: 'endedAt',
      name: 'Ended at',
      render: cellRenderForEndedAt,
    },
  ];

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexGroup direction="row" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate(
                    'xpack.slo.burnRateRule.alertDetailsAppSection.severityHistory.title',
                    {
                      defaultMessage: 'Severity history',
                      values: { sloName: slo.name },
                    }
                  )}
                </h2>
              </EuiTitle>
              <EuiSpacer size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexItem>
            <EuiBasicTable items={items.reverse()} columns={columns} rowProps={getRowProps} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function getSeverityLabelByActionGroup(actionGroup: string) {
  switch (actionGroup) {
    case HIGH_PRIORITY_ACTION.id:
      return HIGH_PRIORITY_ACTION.name;
    case MEDIUM_PRIORITY_ACTION.id:
      return MEDIUM_PRIORITY_ACTION.name;
    case LOW_PRIORITY_ACTION.id:
      return LOW_PRIORITY_ACTION.name;
    default:
      return ALERT_ACTION.name;
  }
}

function getSeverityColorByActionGroup(actionGroup: string) {
  switch (actionGroup) {
    case HIGH_PRIORITY_ACTION.id:
      return 'warning';
    case MEDIUM_PRIORITY_ACTION.id:
      return 'primary';
    case LOW_PRIORITY_ACTION.id:
      return 'success';
    default:
      return 'danger';
  }
}
