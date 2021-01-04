/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';

export const ExpandedRowFieldHeader = ({ children }: { children: React.ReactNode }) => (
  <EuiText size="xs" color={'subdued'} className={'mlFieldDataCard__valuesTitle'}>
    {children}
  </EuiText>
);
