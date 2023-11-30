/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ALERT_DURATION,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_REASON,
  ALERT_STATUS,
  AlertConsumers,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { EuiDataGridColumn } from '@elastic/eui';
import type { ColumnHeaderOptions } from '@kbn/timelines-plugin/common';
import { i18n } from '@kbn/i18n';
import { getDefaultAlertFlyout } from './alerts_flyout/default_alerts_flyout';
import { AlertActionsCell } from './row_actions/alert_actions_cell';
import { AlertsTableConfigurationRegistry, RenderCustomActionsRowArgs } from '../../../types';
import { getAlertFormatters, getRenderCellValue } from './cells/render_cell_value';

const columns: Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> = [
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.statusColumnDescription', {
      defaultMessage: 'Alert Status',
    }),
    id: ALERT_STATUS,
    initialWidth: 110,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.lastUpdatedColumnDescription',
      {
        defaultMessage: 'Last updated',
      }
    ),
    id: TIMESTAMP,
    initialWidth: 230,
    schema: 'datetime',
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.durationColumnDescription', {
      defaultMessage: 'Duration',
    }),
    id: ALERT_DURATION,
    initialWidth: 116,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.reasonColumnDescription', {
      defaultMessage: 'Reason',
    }),
    id: ALERT_REASON,
    linkField: '*',
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.maintenanceWindowsColumnDescription',
      {
        defaultMessage: 'Maintenance windows',
      }
    ),
    id: ALERT_MAINTENANCE_WINDOW_IDS,
    schema: 'string',
    initialWidth: 180,
  },
];

export const getAlertsTableConfiguration = (
  fieldFormats: FieldFormatsRegistry
): AlertsTableConfigurationRegistry => {
  return {
    id: AlertConsumers.STACK_ALERTS,
    columns,
    getRenderCellValue: getRenderCellValue(fieldFormats),
    useInternalFlyout: getDefaultAlertFlyout(columns, getAlertFormatters(fieldFormats)),
    sort: [
      {
        [TIMESTAMP]: {
          order: 'desc' as SortOrder,
        },
      },
    ],
    useActionsColumn: () => ({
      renderCustomActionsRow: (props: RenderCustomActionsRowArgs) => {
        return <AlertActionsCell {...props} />;
      },
    }),
  };
};
