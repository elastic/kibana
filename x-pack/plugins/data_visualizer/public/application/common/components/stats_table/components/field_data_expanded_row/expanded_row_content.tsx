/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode } from 'react';
import { EuiFlexGroup } from '@elastic/eui';

interface Props {
  children: ReactNode;
  dataTestSubj: string;
}
export const ExpandedRowContent: FC<Props> = ({ children, dataTestSubj }) => {
  return (
    <EuiFlexGroup data-test-subj={dataTestSubj} gutterSize={'s'}>
      {children}
    </EuiFlexGroup>
  );
};
