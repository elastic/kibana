/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiDataGridCellValueElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { AlertsTableProps } from '../../../../types';

const ACTIONS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.column.actions',
  {
    defaultMessage: 'Actions',
  }
);

const VIEW_DETAILS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.leadingControl.viewDetails',
  {
    defaultMessage: 'View details',
  }
);

export const getLeadingControlColumns = ({
  leadingControlColumns,
  flyoutAlertIndex,
  setFlyoutAlertIndex,
}: {
  leadingControlColumns: AlertsTableProps['leadingControlColumns'];
  flyoutAlertIndex: number;
  setFlyoutAlertIndex: (index: number) => void;
}) => {
  return [
    {
      id: 'expand',
      width: 120,
      headerCellRender: () => {
        return <span>{ACTIONS_LABEL}</span>;
      },
      rowCellRender: (cveProps: EuiDataGridCellValueElementProps) => {
        const { visibleRowIndex } = cveProps as EuiDataGridCellValueElementProps & {
          visibleRowIndex: number;
        };
        return (
          <EuiFlexGroup gutterSize="none" responsive={false}>
            {flyoutAlertIndex === visibleRowIndex ? (
              <EuiFlexItem grow={false}>
                <EuiIcon type="alert" />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiToolTip content={VIEW_DETAILS_LABEL}>
                <EuiButtonIcon
                  size="s"
                  iconType="expand"
                  color="text"
                  onClick={() => {
                    // setRowClasses({
                    //   ...rowClasses,
                    //   [visibleRowIndex]: 'active',
                    // });
                    setFlyoutAlertIndex(visibleRowIndex);
                  }}
                  data-test-subj="openFlyoutButton"
                  aria-label={VIEW_DETAILS_LABEL}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    ...leadingControlColumns,
  ];
};
