/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';

export const LoadingPanel: FC = () => (
  <EuiPanel className="eui-textCenter">
    <EuiLoadingSpinner size="xl" />
  </EuiPanel>
);
