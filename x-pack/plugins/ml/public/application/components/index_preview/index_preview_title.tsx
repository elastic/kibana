/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTitle } from '@elastic/eui';

interface IndexPreviewTitle {
  indexPreviewTitle: string;
}
export const IndexPreviewTitle: React.FC<IndexPreviewTitle> = ({ indexPreviewTitle }) => (
  <EuiTitle size="xs">
    <span>{indexPreviewTitle}</span>
  </EuiTitle>
);
