/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React from 'react';
import { type EuiDataGridColumn, EuiDescriptionList, EuiPanel, EuiTitle } from '@elastic/eui';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { AlertsTableFlyoutBaseProps, AlertTableFlyoutComponent } from '../../../..';
import { RegisterFormatter } from '../cells/render_cell_value';

const FlyoutHeader: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => {
  const name = alert[ALERT_RULE_NAME];
  return (
    <EuiTitle size="s">
      <h3>{name}</h3>
    </EuiTitle>
  );
};

export const getDefaultAlertFlyout =
  (columns: EuiDataGridColumn[], formatter: RegisterFormatter) => () => {
    const FlyoutBody: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => (
      <EuiPanel>
        <EuiDescriptionList
          listItems={columns.map((column) => {
            const value = get(alert, column.id)?.[0];

            return {
              title: column.displayAsText as string,
              description: value != null ? formatter(column.id, value) : '—',
            };
          })}
          type="column"
          columnWidths={[1, 3]}
        />
      </EuiPanel>
    );

    return {
      body: FlyoutBody,
      header: FlyoutHeader,
      footer: null,
    };
  };
