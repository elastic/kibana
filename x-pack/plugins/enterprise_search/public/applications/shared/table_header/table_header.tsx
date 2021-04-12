/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTableHeader, EuiTableHeaderCell } from '@elastic/eui';

interface TableHeaderProps {
  headerItems: string[];
  extraCell?: boolean;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ headerItems, extraCell }) => (
  <EuiTableHeader>
    {headerItems.map((item, i) => (
      <EuiTableHeaderCell key={i}>{item}</EuiTableHeaderCell>
    ))}
    {extraCell && <EuiTableHeaderCell />}
  </EuiTableHeader>
);
