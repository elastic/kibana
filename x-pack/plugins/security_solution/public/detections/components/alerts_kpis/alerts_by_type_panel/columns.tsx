/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHealth, EuiText } from '@elastic/eui';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { TableId } from '@kbn/securitysolution-data-table';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../../../common/components/cell_actions';
import type { AlertsTypeData, AlertType } from './types';
import { DefaultDraggable } from '../../../../common/components/draggables';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { ALERTS_HEADERS_RULE_NAME } from '../../alerts_table/translations';
import { ALERT_TYPE_COLOR, ALERT_TYPE_LABEL } from './helpers';
import { COUNT_TABLE_TITLE } from '../alerts_count_panel/translations';
import * as i18n from './translations';
import { SourcererScopeName } from '../../../../sourcerer/store/model';

export const getAlertsTypeTableColumns = (
  isAlertTypeEnabled: boolean
): Array<EuiBasicTableColumn<AlertsTypeData>> => [
  {
    field: 'rule',
    name: ALERTS_HEADERS_RULE_NAME,
    'data-test-subj': 'detectionsTable-rule',
    truncateText: true,
    render: (rule: string) => (
      <EuiText size="xs" className="eui-textTruncate">
        <DefaultDraggable
          isDraggable={false}
          field={ALERT_RULE_NAME}
          hideTopN={true}
          id={`alert-detection-draggable-${rule}`}
          value={rule}
          queryValue={rule}
          tooltipContent={null}
          truncate={true}
          scopeId={TableId.alertsOnAlertsPage}
        />
      </EuiText>
    ),
  },
  ...(isAlertTypeEnabled
    ? [
        {
          field: 'type',
          name: i18n.ALERTS_TYPE_COLUMN_TITLE,
          'data-test-subj': 'detectionsTable-type',
          truncateText: true,
          render: (type: string) => {
            return (
              <EuiHealth color={ALERT_TYPE_COLOR[type as AlertType]}>
                <EuiText grow={false} size="xs">
                  <SecurityCellActions
                    mode={CellActionsMode.HOVER_DOWN}
                    visibleCellActions={4}
                    showActionTooltips
                    triggerId={SecurityCellActionsTrigger.DEFAULT}
                    data={{
                      value: 'denied',
                      field: 'event.type',
                    }}
                    sourcererScopeId={SourcererScopeName.detections}
                    metadata={{
                      negateFilters: type === 'Detection', // Detection: event.type != denied
                      scopeId: TableId.alertsOnAlertsPage,
                    }}
                  >
                    {ALERT_TYPE_LABEL[type as AlertType]}
                  </SecurityCellActions>
                </EuiText>
              </EuiHealth>
            );
          },
          width: '30%',
        },
      ]
    : []),
  {
    field: 'value',
    name: COUNT_TABLE_TITLE,
    dataType: 'number',
    sortable: true,
    'data-test-subj': 'detectionsTable-count',
    render: (count: number) => (
      <EuiText grow={false} size="xs">
        <FormattedCount count={count} />
      </EuiText>
    ),
    width: '22%',
  },
];
