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

import { EuiLinkTo } from '../../react_router_helpers';
import { TruncatedContent } from '../../truncate';

import { Schema, FieldCoercionErrors } from '../types';

import {
  ERROR_TABLE_ID_HEADER,
  ERROR_TABLE_ERROR_HEADER,
  ERROR_TABLE_REVIEW_CONTROL,
  ERROR_TABLE_VIEW_LINK,
} from './constants';

import './schema_errors_accordion.scss';

interface Props {
  fieldCoercionErrors: FieldCoercionErrors;
  schema: Schema;
  generateViewPath?(id: string): string;
}

export const SchemaErrorsAccordion: React.FC<Props> = ({
  fieldCoercionErrors,
  schema,
  generateViewPath,
}) => (
  <>
    {Object.keys(fieldCoercionErrors).map((fieldName) => {
      const fieldType = schema[fieldName];
      const errors = fieldCoercionErrors[fieldName];

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
          key={fieldName}
          id={`schemaErrorAccordion-${fieldName}`}
          className="schemaErrorsAccordion euiAccordionForm"
          buttonClassName="euiAccordionForm__button"
          buttonContent={accordionHeader}
        >
          <EuiTable tableLayout="auto">
            <EuiTableHeader>
              <EuiTableHeaderCell>{ERROR_TABLE_ID_HEADER}</EuiTableHeaderCell>
              <EuiTableHeaderCell>{ERROR_TABLE_ERROR_HEADER}</EuiTableHeaderCell>
              {generateViewPath && <EuiTableHeaderCell aria-hidden />}
            </EuiTableHeader>
            <EuiTableBody>
              {errors.map((error) => {
                const { id, error: errorMessage } = error;
                return (
                  <EuiTableRow key={`schemaErrorDocument-${fieldName}-${id}`}>
                    <EuiTableRowCell truncateText>
                      <TruncatedContent tooltipType="title" content={id} length={22} />
                    </EuiTableRowCell>
                    <EuiTableRowCell>{errorMessage}</EuiTableRowCell>
                    {generateViewPath && (
                      <EuiTableRowCell>
                        <EuiLinkTo to={generateViewPath(id)}>{ERROR_TABLE_VIEW_LINK}</EuiLinkTo>
                      </EuiTableRowCell>
                    )}
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
