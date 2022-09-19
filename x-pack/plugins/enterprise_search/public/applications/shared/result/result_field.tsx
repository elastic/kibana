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

import { euiThemeVars } from '@kbn/ui-theme';

import { ResultFieldProps } from './types';
import './result.scss';

const iconMap: Record<string, string> = {
  boolean: 'tokenBoolean',
  date: 'tokenDate',
  date_range: 'tokenDate',
  double: 'tokenNumber',
  double_range: 'tokenDate',
  flattened: 'tokenObject',
  float: 'tokenNumber',
  float_range: 'tokenNumber',
  geo_point: 'tokenGeo',
  geo_shape: 'tokenGeo',
  half_float: 'tokenNumber',
  histogram: 'tokenHistogram',
  integer: 'tokenNumber',
  integer_range: 'tokenNumber',
  ip: 'tokenIp',
  ip_range: 'tokenIp',
  join: 'tokenJoin',
  keyword: 'tokenKeyword',
  long: 'tokenNumber',
  long_range: 'tokenNumber',
  nested: 'tokenObject',
  object: 'tokenObject',
  percolator: 'tokenPercolator',
  rank_feature: 'tokenRankFeature',
  rank_features: 'tokenRankFeatures',
  scaled_float: 'tokenNumber',
  search_as_you_type: 'tokenSearchType',
  shape: 'tokenShape',
  short: 'tokenNumber',
  text: 'tokenString',
  token_count: 'tokenTokenCount',
  unsigned_long: 'tokenNumber',
};
const defaultToken = 'questionInCircle';

export const ResultField: React.FC<ResultFieldProps> = ({
  iconType,
  fieldName,
  fieldValue,
  fieldType,
  isExpanded,
}) => {
  return (
    <EuiTableRow className="resultField">
      <EuiTableRowCell className="resultFieldRowCell" width={euiThemeVars.euiSizeL} valign="middle">
        <span>
          <EuiToken
            className="resultField__token"
            iconType={iconType || (fieldType ? iconMap[fieldType] : defaultToken)}
          />
        </span>
      </EuiTableRowCell>
      <EuiTableRowCell
        className="resultFieldRowCell"
        width="25%"
        truncateText={!isExpanded}
        valign="middle"
      >
        <EuiText size="xs">{fieldName}</EuiText>
      </EuiTableRowCell>
      <EuiTableRowCell
        className="resultFieldRowCell"
        width={euiThemeVars.euiSizeXXL}
        valign="middle"
      >
        <EuiIcon type="sortRight" color="subdued" />
      </EuiTableRowCell>
      <EuiTableRowCell className="resultFieldRowCell" truncateText={!isExpanded} valign="middle">
        {(fieldType === 'object' ||
          fieldType === 'array' ||
          fieldType === 'nested' ||
          Array.isArray(fieldValue)) &&
        isExpanded ? (
          <EuiCodeBlock language="json" overflowHeight="250" transparentBackground>
            {fieldValue}
          </EuiCodeBlock>
        ) : (
          <EuiText size="xs">{fieldValue}</EuiText>
        )}
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
