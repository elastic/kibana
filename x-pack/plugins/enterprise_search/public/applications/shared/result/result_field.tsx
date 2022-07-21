/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCodeBlock,
  EuiIcon,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  EuiToken,
} from '@elastic/eui';

import { ResultFieldProps } from './types';
import './result.scss';

export const ResultField: React.FC<ResultFieldProps> = ({
  iconType = 'tokenString',
  fieldName,
  fieldValue,
  fieldType,
  isExpanded,
}) => {
  return (
    <EuiTableRow className="resultField">
      <EuiTableRowCell width="5%" valign="middle">
        <span>
          <EuiToken iconType={iconType} />
        </span>
      </EuiTableRowCell>
      <EuiTableRowCell width="25%" valign="middle">
        <EuiText size="xs" grow={false}>
          {fieldName}
        </EuiText>
      </EuiTableRowCell>
      <EuiTableRowCell width="5%" valign="middle">
        <EuiIcon type="sortRight" color="subdued" />
      </EuiTableRowCell>
      <EuiTableRowCell truncateText valign="middle">
        {(fieldType === 'object' ||
          fieldType === 'array' ||
          fieldType === 'nested' ||
          Array.isArray(fieldValue)) &&
        isExpanded ? (
          <EuiCodeBlock language="json" overflowHeight="250" transparentBackground>
            {fieldValue}
          </EuiCodeBlock>
        ) : (
          <EuiText size="xs" grow={false}>
            {fieldValue}
          </EuiText>
        )}
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
