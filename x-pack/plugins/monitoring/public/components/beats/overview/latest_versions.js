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

export function LatestVersions({ latestVersions }) {
  const versions = latestVersions.map(({ version, count }, index) => {
    return (
      <KuiTableRow key={`latest-version-${index}`}>
        <KuiTableRowCell>{version}</KuiTableRowCell>
        <KuiTableRowCell align="right">{count}</KuiTableRowCell>
      </KuiTableRow>
    );
  });

  return (
    <KuiTable>
      <KuiTableBody>
        {versions}
      </KuiTableBody>
    </KuiTable>
  );
}
