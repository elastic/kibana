/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToken, EuiCodeBlock } from '@elastic/eui';

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
    <EuiFlexItem className="resultField">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiToken iconType={iconType} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">{fieldName}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sortRight" color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          {(fieldType === 'object' || fieldType === 'array' || fieldType === 'nested') &&
          isExpanded ? (
            <EuiCodeBlock language="json">{fieldValue}</EuiCodeBlock>
          ) : (
            <EuiText className="resultFieldText" size="xs" grow={false}>
              {fieldValue}
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
