/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { useWizard } from '.';

export function PageTitle() {
  const { getPath } = useWizard();
  const [currentStep] = getPath().reverse();

  if (currentStep === 'installElasticAgent') {
    return (
      <EuiTitle size="l">
        <h1>Select your shipper</h1>
      </EuiTitle>
    );
  }

  if (currentStep === 'importData') {
    return (
      <EuiTitle size="l">
        <h1>Incoming logs</h1>
      </EuiTitle>
    );
  }

  return (
    <EuiTitle size="l">
      <h1>Collect and analyze my logs</h1>
    </EuiTitle>
  );
}
