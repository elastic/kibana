/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTableHeader, EuiTableHeaderCell } from '@elastic/eui';

interface ITableHeaderProps {
  headerItems: string[];
  extraCell?: boolean;
}

export const TableHeader: React.FC<ITableHeaderProps> = ({ headerItems, extraCell }) => (
  <EuiTableHeader>
    {headerItems.map((item, i) => (
      <EuiTableHeaderCell key={i}>{item}</EuiTableHeaderCell>
    ))}
    {extraCell && <EuiTableHeaderCell />}
  </EuiTableHeader>
);
