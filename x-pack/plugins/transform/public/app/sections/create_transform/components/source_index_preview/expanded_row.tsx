/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiBadge, EuiText } from '@elastic/eui';

import { EsDoc } from '../../../../common';

export const ExpandedRow: React.FC<{ item: EsDoc }> = ({ item }) => (
  <EuiText>
    {Object.entries(item._source).map(([k, value]) => (
      <span key={k}>
        <EuiBadge>{k}:</EuiBadge>
        <small> {typeof value === 'string' ? value : JSON.stringify(value)}&nbsp;&nbsp;</small>
      </span>
    ))}
  </EuiText>
);
