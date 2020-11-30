/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

import { SchemaExistingField } from 'shared/components/Schema';
import { SchemaLogic } from './SchemaLogic';

export const SchemaFieldsTable: React.FC = () => {
  const { updateExistingFieldType } = useActions(SchemaLogic);

  const { filteredSchemaFields, filterValue } = useValues(SchemaLogic);

  return Object.keys(filteredSchemaFields).length > 0 ? (
    <EuiTable>
      <EuiTableHeader>
        <EuiTableHeaderCell>Field Name</EuiTableHeaderCell>
        <EuiTableHeaderCell>Data Type</EuiTableHeaderCell>
      </EuiTableHeader>
      <EuiTableBody>
        {Object.keys(filteredSchemaFields).map((fieldName) => (
          <EuiTableRow key={fieldName} data-test-subj="SchemaFieldRow">
            <EuiTableRowCell>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <strong>{fieldName}</strong>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiTableRowCell>
            <EuiTableRowCell>
              <SchemaExistingField
                disabled={fieldName === 'id'}
                key={fieldName}
                fieldName={fieldName}
                hideName={true}
                fieldType={filteredSchemaFields[fieldName]}
                updateExistingFieldType={updateExistingFieldType}
              />
            </EuiTableRowCell>
          </EuiTableRow>
        ))}
      </EuiTableBody>
    </EuiTable>
  ) : (
    <p>No results found for &apos;{filterValue}&apos;.</p>
  );
};
