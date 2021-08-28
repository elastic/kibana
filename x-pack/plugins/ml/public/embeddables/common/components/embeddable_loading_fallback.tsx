/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';

export const EmbeddableLoading = () => {
  return (
    <EuiText textAlign="center">
      <EuiSpacer size="l" />
      <EuiLoadingSpinner size="l" />
      <EuiSpacer size="l" />
    </EuiText>
  );
};
