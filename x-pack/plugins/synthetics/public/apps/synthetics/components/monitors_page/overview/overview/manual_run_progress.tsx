/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { manualTestRunSelector } from '../../../../state/manual_test_runs';

export const ManualTestRunProgress = ({ configId }: { configId: string }) => {
  const testNowRun = useSelector(manualTestRunSelector(configId));

  const inProgress = testNowRun?.status === 'in-progress' || testNowRun?.status === 'loading';

  return inProgress ? (
    <EuiToolTip position="top" content="Test is in progress">
      <EuiLoadingSpinner />
    </EuiToolTip>
  ) : null;
};
