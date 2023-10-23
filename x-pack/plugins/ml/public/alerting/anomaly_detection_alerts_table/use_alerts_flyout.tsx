/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertsTableFlyoutBaseProps,
  AlertTableFlyoutComponent,
} from '@kbn/triggers-actions-ui-plugin/public';
import { get } from 'lodash';
import React from 'react';
import { EuiDescriptionList, type EuiDataGridColumn, EuiPanel } from '@elastic/eui';
import { RegisterFormatter } from './render_cell_value';

const FlyoutHeader: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => {
  const { 'kibana.alert.rule.name': name } = alert;
  return <div data-test-subj="alertsFlyoutName">{name}</div>;
};

export const getAlertFlyout =
  (columns: EuiDataGridColumn[], formatter: RegisterFormatter) => () => {
    const FlyoutBody: AlertTableFlyoutComponent = ({ alert, id }: AlertsTableFlyoutBaseProps) => (
      <EuiPanel>
        <EuiDescriptionList
          listItems={columns.map((column) => {
            return {
              title: column.displayAsText as string,
              description: formatter(column.id, get(alert, column.id)[0]),
            };
          })}
          type="column"
          columnWidths={[1, 3]} // Same as [25, 75]
        />
      </EuiPanel>
    );

    return {
      body: FlyoutBody,
      header: FlyoutHeader,
      footer: null,
    };
  };
