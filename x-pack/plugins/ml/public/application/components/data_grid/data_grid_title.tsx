/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTitle } from '@elastic/eui';

interface DataGridTitle {
  dataGridTitle: string;
}
export const DataGridTitle: React.FC<DataGridTitle> = ({ dataGridTitle }) => (
  <EuiTitle size="xs">
    <span>{dataGridTitle}</span>
  </EuiTitle>
);
