/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertsTableFlyoutBaseProps,
  AlertTableFlyoutComponent,
} from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import { type EuiDataGridColumn } from '@elastic/eui';
import type { RegisterFormatter } from './render_cell_value';
import { AlertFlyoutLazy } from './alert_flyout_lazy';
import { AlertFlyoutHeaderLazy } from './alert_flyout_header_lazy';

export const getAlertFlyout =
  (columns: EuiDataGridColumn[], formatter: RegisterFormatter) => () => {
    const FlyoutBody: AlertTableFlyoutComponent = ({ alert, id }: AlertsTableFlyoutBaseProps) => (
      <AlertFlyoutLazy isLoading={false} columns={columns} formatter={formatter} alert={alert} />
    );

    return {
      body: FlyoutBody,
      header: AlertFlyoutHeaderLazy,
      footer: null,
    };
  };
