/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';

export const ExpandedRowFieldHeader = ({ children }: { children: React.ReactNode }) => (
  <EuiText size="xs" color={'subdued'} className={'fieldDataCard__valuesTitle'}>
    {children}
  </EuiText>
);
