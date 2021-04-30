/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

import { EuiButtonEmptyTo } from '../../react_router_helpers';
import { TruncatedContent } from '../../truncate';

import { FieldCoercionErrors } from '../types';

import {
  ERROR_TABLE_ID_HEADER,
  ERROR_TABLE_ERROR_HEADER,
  ERROR_TABLE_REVIEW_CONTROL,
  ERROR_TABLE_VIEW_LINK,
} from './constants';

import './schema_errors_accordion.scss';

interface ISchemaErrorsAccordionProps {
  fieldCoercionErrors: FieldCoercionErrors;
  schema: { [key: string]: string };
  itemId?: string;
  getRoute?(itemId: string, externalId: string): string;
}

export const SchemaErrorsAccordion: React.FC<ISchemaErrorsAccordionProps> = ({
  fieldCoercionErrors,
  schema,
  itemId,
  getRoute,
}) => (
  <>
    {Object.keys(fieldCoercionErrors).map((fieldName, fieldNameIndex) => {
      const fieldType = schema[fieldName];
      const errorInfos = fieldCoercionErrors[fieldName];

      const accordionHeader = (
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="xl"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <strong>
              <TruncatedContent content={fieldName} length={32} />
            </strong>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <code>{fieldType}</code>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* Mock an EuiButton without actually creating one - we shouldn't nest a button within a button */}
            <div className="euiButton euiButton--primary euiButton--small">
              {ERROR_TABLE_REVIEW_CONTROL}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      return (
        <EuiAccordion
          key={fieldNameIndex}
          id={`accordion${fieldNameIndex}`}
          className="schemaErrorsAccordion euiAccordionForm"
          buttonClassName="euiAccordionForm__button"
          buttonContent={accordionHeader}
        >
          <EuiTable tableLayout="auto">
            <EuiTableHeader>
              <EuiTableHeaderCell>{ERROR_TABLE_ID_HEADER}</EuiTableHeaderCell>
              <EuiTableHeaderCell>{ERROR_TABLE_ERROR_HEADER}</EuiTableHeaderCell>
              <EuiTableHeaderCell />
            </EuiTableHeader>
            <EuiTableBody>
              {errorInfos.map((error, errorIndex) => {
                const showViewButton = getRoute && itemId;
                const documentPath = getRoute && itemId ? getRoute(itemId, error.external_id) : '';

                const viewButton = showViewButton && (
                  <EuiTableRowCell>
                    <EuiButtonEmptyTo to={documentPath}>{ERROR_TABLE_VIEW_LINK}</EuiButtonEmptyTo>
                  </EuiTableRowCell>
                );

                return (
                  <EuiTableRow key={`schema-change-document-error-${fieldName}-${errorIndex}`}>
                    <EuiTableRowCell truncateText>
                      <TruncatedContent
                        tooltipType="title"
                        content={error.external_id}
                        length={22}
                      />
                    </EuiTableRowCell>
                    <EuiTableRowCell>{error.error}</EuiTableRowCell>
                    {showViewButton ? viewButton : <EuiTableRowCell />}
                  </EuiTableRow>
                );
              })}
            </EuiTableBody>
          </EuiTable>
        </EuiAccordion>
      );
    })}
  </>
);
