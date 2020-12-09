/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

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

import { SchemaExistingField } from '../../../../../shared/schema/schema_existing_field';
import { SchemaLogic } from './schema_logic';
import {
  SCHEMA_ERRORS_TABLE_FIELD_NAME_HEADER,
  SCHEMA_ERRORS_TABLE_DATA_TYPE_HEADER,
} from './constants';

export const SchemaFieldsTable: React.FC = () => {
  const { updateExistingFieldType } = useActions(SchemaLogic);

  const { filteredSchemaFields, filterValue } = useValues(SchemaLogic);

  return Object.keys(filteredSchemaFields).length > 0 ? (
    <EuiTable tableLayout="auto">
      <EuiTableHeader>
        <EuiTableHeaderCell>{SCHEMA_ERRORS_TABLE_FIELD_NAME_HEADER}</EuiTableHeaderCell>
        <EuiTableHeaderCell align="right">
          {SCHEMA_ERRORS_TABLE_DATA_TYPE_HEADER}
        </EuiTableHeaderCell>
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
            <EuiTableRowCell align="right">
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
    <p>
      {i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.contentSource.schema.filter.noResults.message',
        {
          defaultMessage: 'No results found for "{filterValue}".',
          values: { filterValue },
        }
      )}
    </p>
  );
};
