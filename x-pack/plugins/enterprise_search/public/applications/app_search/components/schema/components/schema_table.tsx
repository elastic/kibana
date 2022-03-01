/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiTable,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiHealth,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SchemaFieldTypeSelect } from '../../../../shared/schema';
import { FIELD_NAME, FIELD_TYPE } from '../../../../shared/schema/constants';

import { AppLogic } from '../../../app_logic';

import { SchemaLogic } from '../schema_logic';

export const SchemaTable: React.FC = () => {
  const {
    myRole: { canManageEngines },
  } = useValues(AppLogic);
  const { schema, unconfirmedFields } = useValues(SchemaLogic);
  const { updateSchemaFieldType } = useActions(SchemaLogic);

  return (
    <EuiTable tableLayout="auto">
      <EuiTableHeader>
        <EuiTableHeaderCell>{FIELD_NAME}</EuiTableHeaderCell>
        <EuiTableHeaderCell aria-hidden />
        <EuiTableHeaderCell align="right" id="schemaFieldType">
          {FIELD_TYPE}
        </EuiTableHeaderCell>
      </EuiTableHeader>
      <EuiTableBody>
        <EuiTableRow style={{ height: 56 }}>
          <EuiTableRowCell>
            <EuiText color="subdued">
              <code>id</code>
            </EuiText>
          </EuiTableRowCell>
          <EuiTableRowCell aria-hidden />
          <EuiTableRowCell align="right" />
        </EuiTableRow>
        {Object.entries(schema).map(([fieldName, fieldType]) => {
          const isRecentlyAdded = unconfirmedFields.length && unconfirmedFields.includes(fieldName);

          return (
            <EuiTableRow key={fieldName}>
              <EuiTableRowCell>
                <code>{fieldName}</code>
              </EuiTableRowCell>
              {isRecentlyAdded ? (
                <EuiTableRowCell align="right">
                  <EuiHealth color="success">
                    <EuiText color="subdued" size="s">
                      {i18n.translate(
                        'xpack.enterpriseSearch.appSearch.engine.schema.unconfirmedFieldLabel',
                        { defaultMessage: 'Recently added' }
                      )}
                    </EuiText>
                  </EuiHealth>
                </EuiTableRowCell>
              ) : (
                <EuiTableRowCell aria-hidden />
              )}
              <EuiTableRowCell align="right" width={150}>
                <SchemaFieldTypeSelect
                  fieldName={fieldName}
                  fieldType={fieldType}
                  disabled={!canManageEngines}
                  updateExistingFieldType={updateSchemaFieldType}
                  aria-labelledby="schemaFieldType"
                />
              </EuiTableRowCell>
            </EuiTableRow>
          );
        })}
      </EuiTableBody>
    </EuiTable>
  );
};
