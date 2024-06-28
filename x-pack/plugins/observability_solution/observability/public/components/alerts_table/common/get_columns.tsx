/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We need to produce types and code transpilation at different folders during the build of the package.
 * We have types and code at different imports because we don't want to import the whole package in the resulting webpack bundle for the plugin.
 * This way plugins can do targeted imports to reduce the final code bundle
 */
import {
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_DURATION,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_START,
  ALERT_STATUS,
  ALERT_INSTANCE_ID,
  TAGS,
} from '@kbn/rule-data-utils';
import { EuiDataGridColumn } from '@elastic/eui';
import type { ColumnHeaderOptions } from '@kbn/timelines-plugin/common';
import { i18n } from '@kbn/i18n';

/**
 * columns implements a subset of `EuiDataGrid`'s `EuiDataGridColumn` interface,
 * plus additional TGrid column properties
 */
export const getColumns = (
  {
    showRuleName,
  }: {
    showRuleName?: boolean;
  } = { showRuleName: false }
): Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> => {
  const ruleNameColumn: Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  > = showRuleName
    ? [
        {
          columnHeaderType: 'not-filtered',
          displayAsText: i18n.translate(
            'xpack.observability.alertsTGrid.ruleNameColumnDescription',
            {
              defaultMessage: 'Rule name',
            }
          ),
          id: ALERT_RULE_NAME,
          initialWidth: 150,
        },
      ]
    : [];

  return [
    {
      columnHeaderType: 'not-filtered',
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.statusColumnDescription', {
        defaultMessage: 'Alert Status',
      }),
      id: ALERT_STATUS,
      initialWidth: 120,
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.triggeredColumnDescription', {
        defaultMessage: 'Triggered',
      }),
      id: ALERT_START,
      initialWidth: 190,
      schema: 'datetime',
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.durationColumnDescription', {
        defaultMessage: 'Duration',
      }),
      id: ALERT_DURATION,
      initialWidth: 70,
    },
    ...ruleNameColumn,
    {
      columnHeaderType: 'not-filtered',
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.sourceColumnDescription', {
        defaultMessage: 'Group',
      }),
      id: ALERT_INSTANCE_ID,
      initialWidth: 100,
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: i18n.translate(
        'xpack.observability.alertsTGrid.observedValueColumnDescription',
        {
          defaultMessage: 'Observed value',
        }
      ),
      id: ALERT_EVALUATION_VALUE,
      initialWidth: 100,
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.thresholdColumnDescription', {
        defaultMessage: 'Threshold',
      }),
      id: ALERT_EVALUATION_THRESHOLD,
      initialWidth: 100,
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.tagsColumnDescription', {
        defaultMessage: 'Tags',
      }),
      id: TAGS,
      initialWidth: 150,
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.reasonColumnDescription', {
        defaultMessage: 'Reason',
      }),
      id: ALERT_REASON,
      linkField: '*',
    },
  ];
};
