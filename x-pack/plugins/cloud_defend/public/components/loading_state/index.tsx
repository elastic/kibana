/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiSpacer, EuiPageTemplate } from '@elastic/eui';
import React from 'react';

// Keep this component lean as it is part of the main app bundle
export const LoadingState: React.FunctionComponent<{ ['data-test-subj']?: string }> = ({
  children,
  ...rest
}) => {
  return (
    <EuiPageTemplate.EmptyPrompt {...rest}>
      <EuiLoadingSpinner size="xl" />
      <EuiSpacer />
      {children}
    </EuiPageTemplate.EmptyPrompt>
  );
};
