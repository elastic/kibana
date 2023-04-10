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
