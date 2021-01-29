/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

import { EuiLinkTo } from '../react_router_helpers';

import { TruncatedContent } from '../truncate';

import {
  ERROR_TABLE_ID_HEADER,
  ERROR_TABLE_ERROR_HEADER,
  ERROR_TABLE_REVIEW_CONTROL,
  ERROR_TABLE_VIEW_LINK,
} from './constants';

interface IFieldCoercionError {
  external_id: string;
  error: string;
}

interface IFieldCoercionErrors {
  [key: string]: IFieldCoercionError[];
}

interface ISchemaErrorsAccordionProps {
  fieldCoercionErrors: IFieldCoercionErrors;
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
      const errorInfos = fieldCoercionErrors[fieldName];

      const accordionHeader = (
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xl">
              <EuiFlexItem className="field-error__field-name">
                <TruncatedContent content={fieldName} length={32} />
              </EuiFlexItem>
              <EuiFlexItem className="field-error__field-type">{schema[fieldName]}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span className="field-error__control button">{ERROR_TABLE_REVIEW_CONTROL}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      return (
        <EuiAccordion
          key={fieldNameIndex}
          id={`accordion${fieldNameIndex}`}
          className="euiAccordionForm field-error"
          buttonClassName="euiAccordionForm__button field-error__header"
          buttonContent={accordionHeader}
          paddingSize="xl"
        >
          <EuiTable>
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
                  <EuiTableRowCell className="field-error-document__actions">
                    <EuiLinkTo
                      className="euiButtonEmpty euiButtonEmpty--primary euiButtonEmpty--xSmall"
                      to={documentPath}
                    >
                      <span className="euiButtonEmpty__content">
                        <span className="euiButtonEmpty__text">{ERROR_TABLE_VIEW_LINK}</span>
                      </span>
                    </EuiLinkTo>
                  </EuiTableRowCell>
                );

                return (
                  <EuiTableRow
                    key={`schema-change-document-error-${fieldName}-${errorIndex} field-error-document`}
                  >
                    <EuiTableRowCell className="field-error-document__id">
                      <div className="data-type--id">
                        <TruncatedContent
                          tooltipType="title"
                          content={error.external_id}
                          length={22}
                        />
                      </div>
                    </EuiTableRowCell>
                    <EuiTableRowCell className="field-error-document__field-content">
                      {error.error}
                    </EuiTableRowCell>
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
