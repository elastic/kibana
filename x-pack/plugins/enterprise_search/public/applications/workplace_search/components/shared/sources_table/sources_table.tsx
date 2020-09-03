/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTable, EuiTableBody } from '@elastic/eui';

import { TableHeader } from '../../../../shared/table_header/table_header';
import { SourceRow, ISourceRow } from '../source_row';
import { IContentSourceDetails } from '../../../types';

interface ISourcesTableProps extends ISourceRow {
  sources: IContentSourceDetails[];
}

export const SourcesTable: React.FC<ISourcesTableProps> = ({
  sources,
  showDetails,
  isOrganization,
  onSearchableToggle,
}) => {
  const headerItems = ['Source', 'Status', 'Documents'];
  if (onSearchableToggle) headerItems.push('Searchable');

  return (
    <EuiTable className="table table--emphasized" responsive={false}>
      <TableHeader extraCell headerItems={headerItems} />
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
