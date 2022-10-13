/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { FullSizeCenteredPage } from './full_size_centered_page';

// Keep this component lean as it is part of the main app bundle
export const CspLoadingState: React.FunctionComponent<{ ['data-test-subj']?: string }> = ({
  children,
  ...rest
}) => {
  return (
    <FullSizeCenteredPage data-test-subj={rest['data-test-subj']}>
      <EuiLoadingSpinner size="xl" />
      <EuiSpacer />
      {children}
    </FullSizeCenteredPage>
  );
};
