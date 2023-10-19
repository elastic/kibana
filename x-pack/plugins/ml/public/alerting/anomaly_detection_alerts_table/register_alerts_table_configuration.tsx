/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  AlertsTableFlyoutBaseProps,
  AlertTableFlyoutComponent,
  type TriggersAndActionsUIPublicPluginSetup,
} from '@kbn/triggers-actions-ui-plugin/public';
import { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import React from 'react';
import { EuiDataGridColumn, EuiHealth } from '@elastic/eui';
import { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { get } from 'lodash';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALERT_DURATION, ALERT_RULE_NAME, ALERT_START, ALERT_STATUS } from '@kbn/rule-data-utils';
import { getSeverityColor } from '@kbn/ml-anomaly-utils';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import {
  ALERT_ANOMALY_DETECTION_JOB_ID,
  ALERT_ANOMALY_SCORE,
  ALERT_ANOMALY_TIMESTAMP,
} from '../../../common/constants/alerts';
import { getRenderCellValue } from './render_cell_value';

export function registerAlertsTableConfiguration(
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup,
  fieldFormats: FieldFormatsRegistry
) {
  const columns: EuiDataGridColumn[] = [
    {
      id: ALERT_STATUS,
      displayAsText: i18n.translate('xpack.ml.alertsTable.columns.status', {
        defaultMessage: 'Status',
      }),
      initialWidth: 150,
    },
    {
      id: ALERT_RULE_NAME,
      displayAsText: i18n.translate('xpack.ml.alertsTable.columns.ruleName', {
        defaultMessage: 'Rule name',
      }),
      initialWidth: 150,
    },
    {
      id: ALERT_ANOMALY_DETECTION_JOB_ID,
      displayAsText: i18n.translate('xpack.ml.alertsTable.columns.jobId', {
        defaultMessage: 'Job ID',
      }),
      initialWidth: 150,
    },
    {
      id: ALERT_ANOMALY_SCORE,
      displayAsText: i18n.translate('xpack.ml.alertsTable.columns.anomalyScore', {
        defaultMessage: 'Anomaly score',
      }),
      initialWidth: 150,
      isSortable: true,
      schema: 'number',
      display: (value: number) => (
        <EuiHealth color={getSeverityColor(value)}>{Math.floor(value)}</EuiHealth>
      ),
    },
    {
      id: ALERT_START,
      displayAsText: i18n.translate('xpack.ml.alertsTable.columns.triggeredAt', {
        defaultMessage: 'Triggered at',
      }),
      initialWidth: 250,
      schema: 'datetime',
    },
    {
      id: ALERT_ANOMALY_TIMESTAMP,
      displayAsText: i18n.translate('xpack.ml.alertsTable.columns.anomalyTime', {
        defaultMessage: 'Anomaly time',
      }),
      initialWidth: 250,
      schema: 'datetime',
    },
    {
      id: ALERT_DURATION,
      displayAsText: i18n.translate('xpack.ml.alertsTable.columns.duration', {
        defaultMessage: 'Duration',
      }),
      initialWidth: 150,
    },
  ];

  const FlyoutBody: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => (
    <ul>
      {columns.map((column) => (
        <li data-test-subj={`alertsFlyout${column.displayAsText}`} key={column.id}>
          {get(alert as any, column.id, [])[0]}
        </li>
      ))}
    </ul>
  );

  const FlyoutHeader: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => {
    const { 'kibana.alert.rule.name': name } = alert;
    return <div data-test-subj="alertsFlyoutName">{name}</div>;
  };

  const useInternalFlyout = () => ({
    body: FlyoutBody,
    header: FlyoutHeader,
    footer: null,
  });

  const sort: SortCombinations[] = [
    {
      [ALERT_START]: {
        order: 'desc' as SortOrder,
      },
    },
  ];

  const config: AlertsTableConfigurationRegistry = {
    id: ML_ALERTS_CONFIG_ID,
    columns,
    // cases: { featureId: 'cases', owner: ['observability'] },
    useInternalFlyout,
    getRenderCellValue: getRenderCellValue(fieldFormats),
    sort,
  };

  triggersActionsUi.alertsTableConfigurationRegistry.register(config);
}

export const ML_ALERTS_CONFIG_ID = 'mlAlerts';
