/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';

export const ConfigForm: React.FC<{
  type: string;
  supportedOss: string[];
  children: React.ReactNode;
  id: string;
}> = React.memo(({ type, supportedOss, children, id }) => {
  return (
    <EuiPanel data-test-subj={id}>
      <span>{`Type: ${type}`}</span>
      <span>{`OS: ${supportedOss.join(',')}`}</span>
      {children}
    </EuiPanel>
  );
});
