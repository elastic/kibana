/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUES,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_TAGS,
  ALERT_START,
  ALERT_STATUS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { i18n } from '@kbn/i18n';
import { getDefaultAlertFlyout } from './alerts_flyout/default_alerts_flyout';
import { AlertActionsCell } from './row_actions/alert_actions_cell';
import { AlertsTableConfigurationRegistry, RenderCustomActionsRowArgs } from '../../../types';
import { getAlertFormatters, getRenderCellValue } from './cells/render_cell_value';
import { ALERT_TABLE_GENERIC_CONFIG_ID } from '../../../../common';

const columns = [
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.statusColumnDescription', {
      defaultMessage: 'Alert Status',
    }),
    id: ALERT_STATUS,
    initialWidth: 120,
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
    initialWidth: 200,
    schema: 'datetime',
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.startedColumnDescription', {
      defaultMessage: 'Started',
    }),
    id: ALERT_START,
    initialWidth: 200,
    schema: 'datetime',
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.ruleCategoryColumnDescription',
      {
        defaultMessage: 'Rule category',
      }
    ),
    id: ALERT_RULE_CATEGORY,
    initialWidth: 160,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.ruleColumnDescription', {
      defaultMessage: 'Rule',
    }),
    id: ALERT_RULE_NAME,
    initialWidth: 230,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.ruleTagsColumnDescription', {
      defaultMessage: 'Rule tags',
    }),
    id: ALERT_RULE_TAGS,
    initialWidth: 120,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.evaluationValuesColumnDescription',
      {
        defaultMessage: 'Evaluation values',
      }
    ),
    id: ALERT_EVALUATION_VALUES,
    initialWidth: 120,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate(
      'xpack.triggersActionsUI.alertsTable.evaluationThresholdColumnDescription',
      {
        defaultMessage: 'Evaluation threshold',
      }
    ),
    id: ALERT_EVALUATION_THRESHOLD,
    initialWidth: 120,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.triggersActionsUI.alertsTable.reasonColumnDescription', {
      defaultMessage: 'Reason',
    }),
    id: ALERT_REASON,
    linkField: '*',
    initialWidth: 260,
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
    id: ALERT_TABLE_GENERIC_CONFIG_ID,
    columns,
    getRenderCellValue: getRenderCellValue(fieldFormats),
    useInternalFlyout: getDefaultAlertFlyout(columns, getAlertFormatters(fieldFormats)),
    sort: [
      {
        [TIMESTAMP]: {
          order: 'desc',
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
