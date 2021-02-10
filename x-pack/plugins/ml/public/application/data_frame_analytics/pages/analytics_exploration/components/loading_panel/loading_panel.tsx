/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiLoadingSpinner, EuiPanel, EuiSpacer } from '@elastic/eui';

export const LoadingPanel: FC = () => (
  <>
    <EuiPanel className="eui-textCenter">
      <EuiLoadingSpinner size="xl" />
    </EuiPanel>
    <EuiSpacer size="m" />
  </>
);
