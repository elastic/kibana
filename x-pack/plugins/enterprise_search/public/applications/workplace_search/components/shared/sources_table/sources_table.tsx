/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTable, EuiTableBody, EuiTableHeader, EuiTableHeaderCell } from '@elastic/eui';

import { ACTIONS_HEADER } from '../../../../shared/constants';
import { SOURCE, DOCUMENTS_HEADER, SEARCHABLE_HEADER } from '../../../constants';
import { ContentSourceDetails } from '../../../types';
import { STATUS_HEADER } from '../../../views/content_sources/constants';
import { SourceRow, ISourceRow } from '../source_row';

interface SourcesTableProps extends ISourceRow {
  sources: ContentSourceDetails[];
}

export const SourcesTable: React.FC<SourcesTableProps> = ({
  sources,
  showDetails,
  isOrganization,
  onSearchableToggle,
}) => {
  return (
    <EuiTable responsiveBreakpoint={false}>
      <EuiTableHeader>
        <EuiTableHeaderCell>{SOURCE}</EuiTableHeaderCell>
        <EuiTableHeaderCell>{STATUS_HEADER}</EuiTableHeaderCell>
        <EuiTableHeaderCell>{DOCUMENTS_HEADER}</EuiTableHeaderCell>
        {onSearchableToggle && <EuiTableHeaderCell>{SEARCHABLE_HEADER}</EuiTableHeaderCell>}
        {isOrganization && <EuiTableHeaderCell align="right">{ACTIONS_HEADER}</EuiTableHeaderCell>}
      </EuiTableHeader>
      <EuiTableBody>
        {sources.map((source) => (
          <SourceRow
            key={source.id}
            source={source}
            showDetails={showDetails}
            isOrganization={isOrganization}
            onSearchableToggle={onSearchableToggle}
          />
        ))}
      </EuiTableBody>
    </EuiTable>
  );
};
