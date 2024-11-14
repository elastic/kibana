/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React from 'react';
import { EuiDescriptionList, EuiPanel } from '@elastic/eui';
import { isDefined } from '@kbn/ml-is-defined';
import type { AlertsTableProp } from '@kbn/triggers-actions-ui-plugin/public/types';
import { getAlertFormatters } from './render_cell_value';

export const AlertsTableFlyoutBody: AlertsTableProp<'renderFlyoutBody'> = ({
  alert,
  columns,
  fieldFormats,
}) => {
  const formatter = getAlertFormatters(fieldFormats);
  return (
    <EuiPanel>
      <EuiDescriptionList
        listItems={columns.map((column) => {
          const alertFieldValue = get(alert, column.id);
          const value = (
            Array.isArray(alertFieldValue) ? alertFieldValue.at(-1) : alertFieldValue
          ) as string;

          return {
            title: column.displayAsText as string,
            description: isDefined(value) ? formatter(column.id, value) : '—',
          };
        })}
        type="column"
        columnWidths={[1, 3]} // Same as [25, 75]
      />
    </EuiPanel>
  );
};
