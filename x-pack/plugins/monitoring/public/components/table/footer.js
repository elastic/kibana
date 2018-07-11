/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  KuiToolBarFooter,
  KuiToolBarFooterSection,
  KuiToolBarText
} from '@kbn/ui-framework/components';

export function MonitoringTableFooter({
  pageIndexFirstRow,
  pageIndexLastRow,
  rowsFiltered,
  paginationControls,
  rows,
  showPaginationControls
}) {
  const paginationSection = showPaginationControls ? (
    <KuiToolBarFooterSection>
      <KuiToolBarText>
        { pageIndexFirstRow } &ndash; { pageIndexLastRow } of { rowsFiltered }
      </KuiToolBarText>
      { paginationControls }
    </KuiToolBarFooterSection>
  ) : null;

  return (
    <KuiToolBarFooter>
      <p tabIndex="0">
        Showing {rows.length} {rows.length === 1 ? 'item' : 'items'}
      </p>

      { paginationSection }
    </KuiToolBarFooter>
  );
}
