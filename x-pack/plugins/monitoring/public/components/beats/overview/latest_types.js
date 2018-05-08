/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableBody,
} from '@kbn/ui-framework/components';

export function LatestTypes({ latestTypes }) {
  const types = latestTypes.map(({ type, count }, index) => {
    return (
      <KuiTableRow key={`latest-types-${index}`}>
        <KuiTableRowCell>{type}</KuiTableRowCell>
        <KuiTableRowCell align="right">{count}</KuiTableRowCell>
      </KuiTableRow>
    );
  });

  return (
    <KuiTable>
      <KuiTableBody>
        {types}
      </KuiTableBody>
    </KuiTable>
  );
}
